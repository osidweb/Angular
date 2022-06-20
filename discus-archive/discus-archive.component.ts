import { ConnectionPositionPair } from '@angular/cdk/overlay';
import { Component, ElementRef, Inject, Input, OnInit, Output, Renderer2, ViewChild, EventEmitter, OnDestroy, SimpleChanges, OnChanges } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil, takeWhile } from 'rxjs/operators';
import * as _ from 'underscore';
import { IDiscusArchivedRecord } from '../../interfaces/idiscus-archived';
import DiscusMessage from '../../models/discus-message';
import DiscusMessagebb from '../../models/discus-messagebb';
import DiscusTask from '../../models/discus-task';
import DiscusVoting from '../../models/discus-voting';
import DiscussionDocuments from '../../models/discussion-documents';
import { DiscusService } from '../../services/discus.service';
import { PopupOverlayRef } from '../../services/popup-overlay/popup-overlay-ref';
import { PopupOverlayService } from '../../services/popup-overlay/popup-overlay.service';
import { POPUP_OVERLAY_DATA } from '../../services/popup-overlay/popup-overlay.token';

@Component({
  selector: 'app-discus-archive',
  templateUrl: './discus-archive.component.html',
  styleUrls: ['./discus-archive.component.scss']
})
export class DiscusArchiveComponent implements OnInit, OnChanges, OnDestroy {
  @Input() archived: IDiscusArchivedRecord;
  @Input() document: DiscusTask | DiscusVoting | DiscusMessage | DiscusMessagebb;
  @Input() maindocUnid: string;
  @ViewChild('discusArchiveContainer', { static: false }) discusArchiveContainer: ElementRef;
  @Output() loadArchiveEvent = new EventEmitter<any>();

  private _destroyed: Subject<boolean> = new Subject<boolean>();

  // архив загружается?
  archiveIsLoaded: boolean;
  /**
   * направление загрузки архива
   * -1 дефолтное значение (загрузка из архива снизу),
   * 1 (загрузка из архива сверху)
   */
  downloadDirectionFromArchive: number;
  hoverButtonText: string;

  MAX_NUMBER_OF_COMMENTS = 100;
  MIN_NUMBER_OF_COMMENTS = 50;
  DOWNLOAD_FROM_THE_END = -1;
  DOWNLOAD_FROM_THE_BEGINNING = 1;
  ARCHIVE_MENU_OPEN_CLASS = 'open-archive-menu';

  constructor(
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    private translate: TranslateService,
    private renderer: Renderer2,
    private popupOverlayService: PopupOverlayService,
    private discusService: DiscusService
  ) {
    this.iconRegistry.addSvgIconSetInNamespace
    ('discus-archive', this.sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/svg-sprite-discus-archive.svg'));
  }

  ngOnInit(): void {
    this.archiveIsLoaded  = false;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes && changes.archived && changes.archived.currentValue) {
      this.hoverButtonText = this.getHoverButtonText();
      this.downloadDirectionFromArchive = this.getDownloadDirectionFromArchive();
    }
  }

  /**
   * Загрузить документы из архива
   * @param revers -1 дефолтное значение (загрузка из архива снизу), 1 (загрузка из архива сверху)
   */
  loadArchive(revers?: number): void {
    if (this.archiveIsLoaded) {
      return;
    }

    this.archiveIsLoaded = true;
    revers = revers || this.downloadDirectionFromArchive;
    const
      quantity = 50,
      offset = 0;


    this.discusService.loadDocumentsFromArchive(this.maindocUnid, quantity, offset, this.archived.startCommentDate,
      this.archived.endCommentDate, this.archived.from, this.archived.to, revers)
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: DiscussionDocuments) => {
        const data = {
          archivedUnid: this.document.unid,
          archived: res.archived,
          comments: res.comments
        };
        this.loadArchiveEvent.emit(data);

        this.archiveIsLoaded = false;
      });
  }

  // открыть меню 'загрузить архив'
  openArchiveMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.renderer.addClass(this.discusArchiveContainer.nativeElement, this.ARCHIVE_MENU_OPEN_CLASS);

    const origin = event.target as HTMLElement;
    const positionStrategy = this.popupOverlayService
      .getFlexibleConnectedToStrategy(origin)
      .withPositions([
        new ConnectionPositionPair(
          { originX: 'start', originY: 'top' },
          { overlayX: 'start', overlayY: 'top' }
        ),
        new ConnectionPositionPair(
          { originX: 'start', originY: 'bottom' },
          { overlayX: 'start', overlayY: 'bottom' }
        )
      ]);

    const data = {
      direction: this.downloadDirectionFromArchive
    };

    this.popupOverlayService
      .open(DiscusArchiveMenuComponent, { data, positionStrategy })
      .afterClosed()
      .pipe(
        takeUntil(this._destroyed),
        takeWhile(result => !!result)
      )
      .subscribe((revers: number) => {
        this.renderer.removeClass(this.discusArchiveContainer.nativeElement, this.ARCHIVE_MENU_OPEN_CLASS);
        this.loadArchiveFromMenu(revers);
      });
  }

  // загрузить архив из меню
  loadArchiveFromMenu(revers?: number) {
    revers = revers || this.DOWNLOAD_FROM_THE_END;

    localStorage.setItem('downloadDirectionFromArchive', JSON.stringify(revers));
    this.downloadDirectionFromArchive = revers;
    this.loadArchive(revers);
  }


  ngOnDestroy() {
    this._destroyed.next(null);
    this._destroyed.complete();
  }



  // получить текст при наведении
  private getHoverButtonText(): string {
    const minNumberTostring = this.MIN_NUMBER_OF_COMMENTS.toString();

    return (this.archived.count > this.MAX_NUMBER_OF_COMMENTS)
      ? this.downloadDirectionFromArchive === this.DOWNLOAD_FROM_THE_BEGINNING
        ? this.translate.instant('archive_btn.dwnl_begining')
        : this.translate.instant('archive_btn.dwnl_previous')
      : this.translate.instant('archive_btn.content_hover.previous',
        {
          countm: ((this.archived.count < this.MIN_NUMBER_OF_COMMENTS)
            ? this.archived.count
            : minNumberTostring)
        });
  }

  /**
    * направление загрузки документов из архива
    * данные сохраненные в localStorage
    * -1 дефолтное значение (загрузка с конца), 1 (загрузка с начала)
    * Если комментариев в архиве больше 100, то направление берем из localStorage,
    * иначе берем дефолтное значение - с конца
  */
  private getDownloadDirectionFromArchive(): number {
    return (this.archived.count > this.MAX_NUMBER_OF_COMMENTS)
      ? localStorage.getItem('downloadDirectionFromArchive')
        ? +JSON.parse(localStorage.getItem('downloadDirectionFromArchive'))
        : this.DOWNLOAD_FROM_THE_END
      : this.DOWNLOAD_FROM_THE_END;
  }
}


// archive menu
@Component({
  selector: 'app-discus-archive-menu',
  templateUrl: './discus-archive-menu.component.html',
  styleUrls: ['./discus-archive-menu.component.scss']
})
export class DiscusArchiveMenuComponent implements OnInit {

  constructor(
    @Inject(POPUP_OVERLAY_DATA) public data,
    private popupOverlayRef: PopupOverlayRef
  ) { }

  ngOnInit(): void {
  }

  loadArchive(revers: number): void {
    this.popupOverlayRef.close(revers);
  }

}
