import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Moment } from 'moment';
import * as moment from 'moment';
import * as _ from 'underscore';
import { Subject, takeUntil, takeWhile } from 'rxjs';
import { ConnectionPositionPair } from '@angular/cdk/overlay';

import DiscusTask from '../../../../../models/discus-task';
import User from '../../../../../models/user';
import { UsersService } from '../../../../../services/users.service';
import { PopupOverlayService } from '../../../../../services/popup-overlay/popup-overlay.service';
import { ITaskDesireDatePanelData, ITaskDesireDatePanelModel, TaskDesireDatePanelComponent } from './task-desire-date-panel/task-desire-date-panel.component';
import { DiscusService } from '../../../../../services/discus.service';

interface IDesireDateHistoryContent {
  date?: string;
}
interface IDesireDateHistory {
  type: string;
  label: string;
  isActive: boolean;
  content: IDesireDateHistoryContent;
}

@Component({
  selector: 'app-task-desire-date',
  templateUrl: './task-desire-date.component.html',
  styleUrls: ['./task-desire-date.component.scss']
})
export class TaskDesireDateComponent implements OnInit, OnDestroy, OnChanges {
  @Input() document: DiscusTask;
  @Input() desireDate: string | undefined;

  @ViewChild('isEmpty', { static: true }) isEmpty: TemplateRef<any>;
  @ViewChild('isSet', { static: true }) isSet: TemplateRef<any>;

  currentUser: User;
  desireDateHistory: IDesireDateHistory = {
    type: 'isEmpty',
    label: '',
    isActive: true,
    content: {}
  };
  state = {
    // изменения сохраняются?
    isPreserved: false
  };
  _destroyed = new Subject();

  constructor(
    private usersService: UsersService,
    private popupOverlayService: PopupOverlayService,
    private translateService: TranslateService,
    private discusService: DiscusService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.usersService.currentUser;
    this.desireDateHistory = this.getDesireDateHistory();
  }

  ngOnChanges(changes: SimpleChanges) {
    // обновить запись о дате, если изменилась желаемая дата
    if (this.currentUser && changes && changes.desireDate) {
      this.desireDateHistory = this.getDesireDateHistory();
    }
  }

  ngOnDestroy() {
    this._destroyed.next(null);
    this._destroyed.complete();
  }

  // изменить желаемую дату
  openPanel(event: MouseEvent): void {
    if (!this.desireDateHistory.isActive || this.state.isPreserved) {
      return;
    }

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

    const data: ITaskDesireDatePanelData = {
      date: this.desireDate || null
    };

    this.popupOverlayService
      .open(TaskDesireDatePanelComponent, { data, positionStrategy })
      .afterClosed()
      .pipe(
        takeUntil(this._destroyed),
        takeWhile(result => !!result)
      )
      .subscribe((result: ITaskDesireDatePanelModel) => {
        this.saveDesireDate(result);
      });
  }

  // получить данные для кнопки "Желаемая дата"
  getDesireDateHistory(): IDesireDateHistory {
    // TODO: translate
    let _type, _labelKey, _label, _isActive;
    const _isContent: IDesireDateHistoryContent = {};

    // если установлена желаемая дата
    if (this.document.taskDateEnd && this.document.taskDateEnd !== '') {
      _type = 'isSet';
      _labelKey = 'Запрошен дедлайн'; // Запрошен дедлайн
      _isContent.date = this.getFormattedDate(this.document.taskDateEnd);
    } else {
      _type = 'isEmpty';
      _labelKey = 'Дедлайн'; // Дедлайн
    }

    this.translateService.get(_labelKey)
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: string) => {
        _label = res;
      });

    _isActive = this.componentIsActive();

    return {
      type: _type,
      label: _label,
      isActive: _isActive,
      content: _isContent
    };
  }

  // сомпонент активный (можно изменить дату)?
  componentIsActive(): boolean {
    return this.currentUser.myNameIs([this.document.authorLogin]);
  }

  // получить дату в формате
  getFormattedDate(date: Date | string | number | Moment): string {
    let result = '',
      mDate = moment(date);

    if (!mDate.isValid() && typeof date === 'string') {
      // для старых дат вырезать строку включая ','
      date = date.split(',')[0];
      // попытка парсит дату формата ISO 8601
      mDate = moment(date, moment.ISO_8601);
    }

    if (mDate.isValid()) {
      const now = new Date();

      result = (now.getFullYear() === mDate.year())
        ? mDate.format('D MMM')
        : mDate.format('D MMM YYYY');
    }

    return result;
  }

  saveDesireDate(result: ITaskDesireDatePanelModel): void {
    this.state.isPreserved = true;

    const editedDocument: DiscusTask = _.clone(this.document);
    editedDocument.taskDateEnd = result && result.date
      ? moment(result.date).format('YYYYMMDD')
      : null;

    // если не предано одно из 3-х свойств: AttachedDoc, TaskSharePerformers, TaskPerformers, то бэк не сохраняет документ
    editedDocument.AttachedDoc = editedDocument.AttachedDoc
      ? editedDocument.AttachedDoc
      : [];

    // сохранить обновленный документ
    this.discusService.setDiscusDocument({ document: editedDocument, explicitEditing: true })
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: boolean) => {
        if (res) {
          // документ обновится по сокету и потом ngOnChanges
          this.state.isPreserved = false;
        }
      });
  }

}
