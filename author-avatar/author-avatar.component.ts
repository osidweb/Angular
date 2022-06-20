import { Component, OnInit, Input, ViewChild, ElementRef, Renderer2, AfterViewInit, OnDestroy } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import DiscusMessagebb from '../../models/discus-messagebb';
import DiscusTask from '../../models/discus-task';
import DiscusProcess from '../../models/discus-process';
import DiscusVoting from '../../models/discus-voting';
import DiscusMessage from '../../models/discus-message';
import DiscusAdapt from '../../models/discus-adapt';
import DiscusContact from '../../models/discus-contact';

import { AuthorService } from '../../services/author.service';

@Component({
  selector: 'app-author-avatar',
  templateUrl: './author-avatar.component.html',
  styleUrls: ['./author-avatar.component.scss']
})
export class AuthorAvatarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('avatarContainer', { static: false }) avatarContainer: ElementRef;
  @ViewChild('avatarPhoto', { static: false }) avatarPhoto: ElementRef;

  @Input() document: DiscusTask | DiscusVoting | DiscusMessage | DiscusMessagebb;
  @Input() mainDocument?: DiscusTask | DiscusProcess | DiscusVoting | DiscusAdapt | DiscusContact;
  @Input() aWidth?: number;
  @Input() aWidthMobile?: number;
  @Input() aHeight?: number;
  @Input() aHeightMobile?: number;

  MAX_DESKTOP_SCREEN_WIDTH = 767;
  authorLogin: string;
  backgroundImgUrl: string;
  isMobile: boolean;

  private _destroyed = new Subject();

  constructor(
    private breakpointObserver: BreakpointObserver,
    private renderer: Renderer2,
    private authorService: AuthorService
  ) {
    // при ресайзе на мобильное разрешение  уменьшать картинку
    const BP = { Small: `(max-width: ${this.MAX_DESKTOP_SCREEN_WIDTH}px)` };
    this.breakpointObserver.observe([
      BP.Small
    ])
      .pipe(takeUntil(this._destroyed))
      .subscribe(result => {
        const sizes = {
          width: result.matches ? this.aWidthMobile : this.aWidth,
          height: result.matches ? this.aHeightMobile : this.aHeight
        };

        this.setStylesInComponent(sizes);
      });
  }

  ngOnInit(): void {
    this.isMobile = window.innerWidth < this.MAX_DESKTOP_SCREEN_WIDTH;

    this.authorService.getAuthorLogin(this.document, this.mainDocument)
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: string) => {
        this.authorLogin = res;

        // avatar img url
        this.backgroundImgUrl = 'url(' +
          this.authorService.getAvatarPath(this.authorLogin, false, this.document, this.mainDocument)
          + ')';

        this.getAvatarSizes();
      });
  }

  ngAfterViewInit() {
    const sizes = {
      width: this.isMobile ? this.aWidthMobile : this.aWidth,
      height: this.isMobile ? this.aHeightMobile : this.aHeight
    };

    this.setStylesInComponent(sizes);
  }

  // получить размеры аватара
  getAvatarSizes(): void {
    const DEFAULT_AVATAR_WIDTH = 20;

    this.aWidth = this.aWidth || DEFAULT_AVATAR_WIDTH;
    this.aWidthMobile = this.aWidthMobile || this.aWidth;
    this.aHeight = this.aHeight || this.aWidth;
    this.aHeightMobile = this.aHeightMobile || this.aWidthMobile;
  }

  // применить стили к компоненту
  setStylesInComponent(avatarSizes: { width: number, height: number }): void {
    // стили для контейнера
    if (this.avatarContainer) {
      this.renderer.setStyle(this.avatarContainer.nativeElement, 'width', avatarSizes.width + 'px');
      this.renderer.setStyle(this.avatarContainer.nativeElement, 'height', avatarSizes.height + 'px');
    }

    // стили для блока с фотографией
    if (this.avatarPhoto) {
      this.renderer.setStyle(this.avatarPhoto.nativeElement, 'width', avatarSizes.width + 'px');
      this.renderer.setStyle(this.avatarPhoto.nativeElement, 'height', avatarSizes.height + 'px');
      this.renderer.setStyle(this.avatarPhoto.nativeElement, 'backgroundImage', this.backgroundImgUrl);
    }
  }

  // открыть панель 'Превью профиля'
  openAvatarPanel(): void {
    this.authorService.openAvatarPanel(
      this.authorLogin,
      this.avatarContainer,
      null,
      { document: this.document, mainDocument: this.mainDocument }
    );
  }

  ngOnDestroy() {
    this._destroyed.next(null);
    this._destroyed.complete();
  }

}
