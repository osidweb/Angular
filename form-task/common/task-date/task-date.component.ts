import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { takeUntil, takeWhile } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Moment } from 'moment';
import * as moment from 'moment';
import * as _ from 'underscore';
import { ConnectionPositionPair } from '@angular/cdk/overlay';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

import { ITaskHistory } from '../../../../../interfaces/itask-history';
import DiscusTask from '../../../../../models/discus-task';
import { ETaskAction, IUserInfo, TasksService } from '../../../../../services/tasks.service';
import User from '../../../../../models/user';
import { UsersService } from '../../../../../services/users.service';
import { ShortenNamePipe } from '../../../../../pipes/shorten-username.pipe';
import { PopupOverlayService } from '../../../../../services/popup-overlay/popup-overlay.service';
import { ITaskDatePanelModel, TaskDatePanelComponent } from './task-date-panel/task-date-panel.component';


interface IDateHistoryContent {
  date?: string;
  oldDate?: string;
  additionalInfo?: string;
}
interface IDateHistory {
  type: string;
  label: string;
  isNew: boolean;
  isActive: boolean;
  isWideButton: boolean;
  content: IDateHistoryContent;
}


@Component({
  selector: 'app-task-date',
  templateUrl: './task-date.component.html',
  styleUrls: ['./task-date.component.scss']
})
export class TaskDateComponent implements OnInit, OnDestroy, OnChanges {
  @Input() document: DiscusTask;
  @Input() history: ITaskHistory[];

  @ViewChild('isEmpty', { static: true }) isEmpty: TemplateRef<any>;
  @ViewChild('isSet', { static: true }) isSet: TemplateRef<any>;
  @ViewChild('isCanged', { static: true }) isCanged: TemplateRef<any>;
  @ViewChild('isRemind', { static: true }) isRemind: TemplateRef<any>;
  @ViewChild('isNotify', { static: true }) isNotify: TemplateRef<any>;
  @ViewChild('isClosed', { static: true }) isClosed: TemplateRef<any>;
  @ViewChild('isChecked', { static: true }) isChecked: TemplateRef<any>;

  currentUser: User;
  dateHistory: IDateHistory = {
    type: 'isEmpty',
    label: '',
    isNew: false,
    isActive: true,
    isWideButton: false,
    content: {}
  };
  state = {
    // изменения сохраняются?
    isPreserved: false
  };
  _destroyed = new Subject();

  constructor(
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    private tasksService: TasksService,
    private usersService: UsersService,
    private translateService: TranslateService,
    private shortenName: ShortenNamePipe,
    private popupOverlayService: PopupOverlayService
  ) {
    this.iconRegistry.addSvgIconSetInNamespace
      ('task', this.sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/svg-sprite-task.svg'));
  }

  ngOnInit(): void {
    this.currentUser = this.usersService.currentUser;
    this.dateHistory = this.getDateHistory();
  }

  ngOnChanges(changes: SimpleChanges) {
    // обновить запись о дате, если изменилась последняя запись в истории просьбы
    if (changes && changes.history && changes.history.currentValue && this.currentUser) {
      this.dateHistory = this.getDateHistory();
    }
  }

  ngOnDestroy() {
    this._destroyed.next(null);
    this._destroyed.complete();
  }

  // открыть панель Изменить дату
  openPanel(event: MouseEvent): void {
    if (!this.componentIsActive() || this.state.isPreserved) {
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

    const data = {
      document: this.document
    };

    this.popupOverlayService
      .open(TaskDatePanelComponent, { data, positionStrategy })
      .afterClosed()
      .pipe(
        takeUntil(this._destroyed),
        takeWhile(result => !!result)
      )
      .subscribe((result: ITaskDatePanelModel) => {
        if (result.date) {
          const newDate = moment(result.date).format('YYYYMMDD');
          this.changeDate(newDate);
        }
      });
  }

  // получить данные из Истории
  private getDateHistory(): IDateHistory {
    const DEFAULT_LABEL_TRANSLATE_KEY = 'Дедлайн'; // Дедлайн

    let _type, _label, _isNew, _isActive, _labelAuthor,
      _isWideButton = false;
    const _isContent: IDateHistoryContent = {};
    let taskAuthorUserInfo: IUserInfo = {
      name: '',
      gender: '1'
    };

    // есть запись в истории
    if (this.history && this.history.length > 0) {
      const th: ITaskHistory = this.history[this.history.length - 1];
      // TODO: translate
      switch (th.type) {
        case 'taskDateReal':
          if (th.flags && th.flags.initialTimeline) {
            // исполнитель установил срок
            _type = 'isSet';
            _isContent.date = this.getFormattedDate(this.document.taskDateRealEnd);
            this.translateService.get(DEFAULT_LABEL_TRANSLATE_KEY)
              .pipe(takeUntil(this._destroyed))
              .subscribe((res: string) => {
                _label = res;
              });
          } else {
            // изменен подтвержденный срок выполнения просьбы
            _type = 'isCanged';
            _isContent.oldDate = this.getFormattedDate(th.oldValue.end);
            _isContent.date = this.getFormattedDate(th.value.end);
            this.translateService.get('Дедлайн изменен')
              .pipe(takeUntil(this._destroyed))
              .subscribe((res: string) => {
                _label = res;
              });
          }

          _isNew = this.tasksService.isNew(th, this.document);
          break;

        case 'checker':
          // был назначен проверяющий
          const taskCheckerUserInfo: IUserInfo = this.tasksService.getUserNameAndGenderForHistoryTask({
            autorLogin: th.value.login,
            domain: th.value.domain || null
          });

          _type = 'isChecked';
          _isContent.additionalInfo = 'у ' + this.shortenName.transform(taskCheckerUserInfo.name);
          _isContent.date = this.getFormattedDate(th.created);
          this.translateService.get('Ожидает проверки')
            .pipe(takeUntil(this._destroyed))
            .subscribe((res: string) => {
              _label = res;
            });
          _isNew = this.tasksService.isNew(th, this.document);
          break;

        case 'status':
          switch (th.value.type) {
            case 'notify':
              // уведомляет о выполнении
              _type = 'isCompleted';
              _isContent.date = this.getFormattedDate(th.created);
              this.translateService.get('Уведомляет о выполнении')
                .pipe(takeUntil(this._destroyed))
                .subscribe((res: string) => {
                  _label = res;
                });
              _isNew = this.tasksService.isNew(th, this.document);
              break;

            case 'close':
              // просьба принята
              taskAuthorUserInfo = this.tasksService.getUserNameAndGenderForHistoryTask({
                autorLogin: th.authorLogin,
                domain: this.document.sendShareFrom
              });

              if (this.document.taskDateCompleted && this.document.taskStartDateByPerformer) {
                const _endDate = moment(this.document.taskDateCompleted),
                  _startDate = moment(this.document.taskStartDateByPerformer),
                  _duration = moment.duration(_endDate.diff(_startDate)),
                  durationObj = {
                    day: _duration.days(),
                    hour: _duration.hours()
                  };

                _isContent.additionalInfo = '(затрачено ' +
                  (durationObj.day > 0 ? durationObj.day + ' д. ' : '')
                  + durationObj.hour + ' ч.)';
              }

              _type = 'isClosed';
              _isContent.date = this.getFormattedDate(th.created);

              _labelAuthor = this.shortenName.transform(taskAuthorUserInfo.name);
              this.translateService.get('принял просьбу', { gender: taskAuthorUserInfo.gender })
                .pipe(takeUntil(this._destroyed))
                .subscribe((res: string) => {
                  _label = res;
                });
              _label = _labelAuthor + ' ' + _label;

              _isNew = this.tasksService.isNew(th, this.document);
              _isWideButton = true;
              break;
          }
          break;

        case 'completed':
          // уведомляет о выполнении
          _type = 'isSet';
          _isContent.date = this.getFormattedDate(th.created);
          this.translateService.get('Уведомляет о выполнении')
            .pipe(takeUntil(this._destroyed))
            .subscribe((res: string) => {
              _label = res;
            });

          _isNew = this.tasksService.isNew(th, this.document);
          _isWideButton = true;
          break;

        case 'reject':
          // вернул просьбу
          taskAuthorUserInfo = this.tasksService.getUserNameAndGenderForHistoryTask({
            autorLogin: th.authorLogin,
            domain: this.document.sendShareFrom
          });

          _type = 'isSet';
          _isContent.date = this.getFormattedDate(th.created);

          _labelAuthor = this.shortenName.transform(taskAuthorUserInfo.name);
          this.translateService.get('taskHistoryText.reject', { gender: taskAuthorUserInfo.gender })
            .pipe(takeUntil(this._destroyed))
            .subscribe((res: string) => {
              _label = res;
            });
          _label = _labelAuthor + ' ' + _label;

          _isNew = this.tasksService.isNew(th, this.document);
          _isWideButton = true;
          break;

        case 'remind':
          // отправлено уведомление о просрочке исполнителю
          _type = 'isRemind';
          _isContent.date = this.getFormattedDate(th.created);
          _isContent.additionalInfo = '(просрочено)';
          this.translateService.get(DEFAULT_LABEL_TRANSLATE_KEY)
            .pipe(takeUntil(this._destroyed))
            .subscribe((res: string) => {
              _label = res;
            });
          _isNew = this.tasksService.isNew(th, this.document);
          break;

        case 'notify':
          // просрочка с уведомлением руководителя
          const taskBossUserInfo = th.value && th.value.boss
            ? this.tasksService.getUserNameAndGenderForHistoryTask({
              autorLogin: th.value.boss,
              domain: this.document.sendShareFrom
            })
            : { name: '', gender: '1'};
          const taskBossShortName = this.shortenName.transform(taskBossUserInfo.name);

          _type = 'isNotify';
          _isContent.date = this.getFormattedDate(th.created);
          _isContent.additionalInfo = '(просрочено, ' + taskBossShortName + ' уведомлен)';
          this.translateService.get(DEFAULT_LABEL_TRANSLATE_KEY)
            .pipe(takeUntil(this._destroyed))
            .subscribe((res: string) => {
              _label = res;
            });
          _isNew = this.tasksService.isNew(th, this.document);
          break;

        default:
          this.translateService.get(DEFAULT_LABEL_TRANSLATE_KEY)
            .pipe(takeUntil(this._destroyed))
            .subscribe((res: string) => {
              _label = res;
            });

          if ((this.document.taskDateRealEnd && this.document.taskDateRealEnd !== '') ||
            (this.document.taskDateEnd && this.document.taskDateEnd !== '')
          ) {
            const realDate = (this.document.taskDateRealEnd && this.document.taskDateRealEnd !== '')
              ? this.document.taskDateRealEnd
              : this.document.taskDateEnd;

            _type = 'isSet';
            _isContent.date = this.getFormattedDate(realDate);
          } else {
            _type = 'isEmpty';
          }
          break;
      }
    } else {
      // нет записи в истории
      this.translateService.get(DEFAULT_LABEL_TRANSLATE_KEY)
        .pipe(takeUntil(this._destroyed))
        .subscribe((res: string) => {
          _label = res;
        });
      _isNew = false;

      // если дата не указана
      if (!this.document.taskDateEnd || this.document.taskDateEnd === '') {
        _type = 'isEmpty';
      } else {
        _type = 'isSet';
        _isContent.date = this.getFormattedDate(this.document.taskDateEnd);
      }
    }

    _isActive = this.componentIsActive();

    return {
      type: _type,
      label: _label,
      isNew: _isNew,
      isActive: _isActive,
      isWideButton: _isWideButton,
      content: _isContent
    };

  }

  // получить отформатированную дату для вывода в компонент
  private getFormattedDate(date: Date | string | number | Moment): string {
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

  // компонент активный? (можно изменить дату?)
  private componentIsActive(): boolean {
    const INACTIVE_TASK_STATUSES = [10, 20, 21];

    return (this.document.status === 'open' || this.document.taskPerformerLat[0] === this.tasksService.TASK_IS_SUSPENDED_STATUS) &&
        (this.currentUser.can('write', this.document) ||
          this.currentUser.myNameIs(this.document.taskPerformerLat) ||
          this.currentUser.isEscalManager(this.document.EscalationManagers)) &&
      !_.contains(INACTIVE_TASK_STATUSES, this.document.TaskStateCurrent) && this.document.TaskStateCurrent !== 15;
  }

  // изменить дату
  private changeDate(newDate: string) {
    this.state.isPreserved = true;

    const params = {
      difficulty: '',
      dEndFinish: newDate,
      expectedStatus: this.document.TaskStateCurrent
    };
    this.tasksService
      .taskAction({
        doc: this.document,
        code: ETaskAction.DEADLINE_SET,
        additionalData: params
      })
      .pipe(
        takeWhile(response => response.success)
      )
      .subscribe(res => {
        // документ обновится по сокету
        this.state.isPreserved = false;
      });
  }

}
