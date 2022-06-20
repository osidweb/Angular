import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import * as _ from 'underscore';
import { takeUntil, takeWhile } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import DiscusTask from '../../../../../models/discus-task';
import { IUserInfo, TasksService } from '../../../../../services/tasks.service';
import { ITaskHistory } from '../../../../../interfaces/itask-history';
import { UsersService } from '../../../../../services/users.service';
import User from '../../../../../models/user';
import { ShortenNamePipe } from '../../../../../pipes/shorten-username.pipe';
import { PopupOverlayService } from '../../../../../services/popup-overlay/popup-overlay.service';
import { ConnectionPositionPair } from '@angular/cdk/overlay';
import { ITaskPerformerModel, ITaskPerformerPanelData, TaskPerformerPanelComponent } from './task-performer-panel/task-performer-panel.component';
import { IShareModel } from '../../../../../interfaces/ishare-model';

interface IPerformerHistory {
  label: string;
  text: string;
  isNew: boolean;
  isActive: boolean;
}

@Component({
  selector: 'app-task-performer',
  templateUrl: './task-performer.component.html',
  styleUrls: ['./task-performer.component.scss']
})
export class TaskPerformerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() document: DiscusTask;
  @Input() history: ITaskHistory[];

  SHARE_PERFORMER_LOGIN = 'shareTask';
  currentUser: User;
  allUsers: any;
  allShareUsers: User[];
  performerHistory: IPerformerHistory = {
    label: '',
    text: '',
    isNew: false,
    isActive: true
  };
  state = {
    // изменения сохраняются
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
    // список всех пользователей своей компании
    this.allUsers = this.usersService.users;
    // список всех межпортальных пользователей
    this.allShareUsers = this.usersService.shareUsers;

    this.performerHistory = this.getPerformerHistory();
  }

  ngOnChanges(changes: SimpleChanges) {
    // обновить запись об исполнителе, если изменилась последняя запись в истории просьбы
    if (changes && changes.history && changes.history.currentValue && this.currentUser && this.allUsers && this.allShareUsers) {
      this.performerHistory = this.getPerformerHistory();
    }
  }

  // открыть панель смены исполнителя
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

    const data: ITaskPerformerPanelData = {
      document: this.document,
      performer: this.getPerformer(),
      sharePerformer: this.getSharePerformer(),
      users: [...this.allUsers, ...this.allShareUsers]
    };

    this.popupOverlayService
      .open(TaskPerformerPanelComponent, { data, positionStrategy })
      .afterClosed()
      .pipe(
        takeUntil(this._destroyed),
        takeWhile(result => !!result)
      )
      .subscribe((result: ITaskPerformerModel) => {
        this.changePerformer(result);
      });
  }

  ngOnDestroy() {
    this._destroyed.next(null);
    this._destroyed.complete();
  }

  // получить данные об исполнителе ('osidorova')
  private getPerformer(): string | null {
    const _perf = this.document.taskPerformerLat
      ? this.document.taskPerformerLat[0]
      : this.document.TaskPerformers
        ? this.document.TaskPerformers[0]
        : null;

    return _perf !== this.SHARE_PERFORMER_LOGIN ? _perf : null;
  }

  // получить данные о межпортальном исполнителе ({login: 'antarasova', domain: 'anicom.remote.team'})
  private getSharePerformer(): IShareModel | null {
    return this.document.sharePerformers
      ? this.document.sharePerformers[0]
      : null;
  }

  // получить имя исполнителя просьбы
  private getPerformerName(): string {
    let perfName = '';
    const performerLogin = this.getPerformer();
    const shareInfo = this.getSharePerformer();

    if (performerLogin) {
      const user = _.findWhere(this.allUsers, { id: performerLogin });
      perfName = user ? user.name : performerLogin;
    } else if (shareInfo) {
      // если исполнитель межпортальный
      const shareUser = _.findWhere(this.allShareUsers, { username: shareInfo.login, domain: shareInfo.domain });
      perfName = shareUser.name + ' (' + shareUser.domainName + ')';
    }

    return perfName;
  }

  // можно сменить исполнителя?
  private componentIsActive(): boolean {
    return (this.document.status === 'open' || this.document.taskPerformerLat[0] === this.tasksService.TASK_IS_SUSPENDED_STATUS) &&
      (this.currentUser.can('write', this.document) ||
      this.currentUser.myNameIs(this.document.taskPerformerLat) ||
      this.currentUser.isEscalManager(this.document.EscalationManagers)) &&
      this.document.TaskStateCurrent !== 10;
  }

  // получить историю изменений исполнителя
  private getPerformerHistory(): IPerformerHistory {
    let _label, _text, _new, _isActive;

    this.translateService.get('discus.div_performer')
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: string) => {
        _label = res;
      });

    _text = this.getPerformerName();
    _new = false;
    _isActive = this.componentIsActive();

    if (this.history && this.history.length > 0) {
      const th: ITaskHistory = this.history[this.history.length - 1];

      if (th.type === 'taskPerformer') {
        const taskPerformerOldUserInfo: IUserInfo = this.tasksService.getUserNameAndGenderForHistoryTask({
          autorLogin: th.oldValue.login,
          domain: th.oldValue.domain
        });

        const taskPerformerUserInfo: IUserInfo = this.tasksService.getUserNameAndGenderForHistoryTask({
          autorLogin: th.value.login,
          domain: th.value.domain
        });

        if (taskPerformerOldUserInfo && taskPerformerOldUserInfo.name !== this.tasksService.TASK_IS_SUSPENDED_STATUS) {
          // TODO: translate
          this.translateService.get('Новый исполнитель')
            .pipe(takeUntil(this._destroyed))
            .subscribe((res: string) => {
              _label = res;
            });

          _text = taskPerformerUserInfo.name + ' <span>(вместо ' + this.shortenName.transform(taskPerformerOldUserInfo.name) + ')</span>';
        } else {
          this.translateService.get('discus.div_performer')
            .pipe(takeUntil(this._destroyed))
            .subscribe((res: string) => {
              _label = res;
            });
        }

        _new = this.tasksService.isNew(th, this.document);
      }
    }

    return {
      label: _label,
      text: _text,
      isNew: _new,
      isActive: _isActive
    };
  }

  // изменить исполнителя
  private changePerformer(data: ITaskPerformerModel) {
    // если исполнитель не изменился
    if (!data || (!data.performer && !data.sharePerformer)) {
      return;
    }

    this.state.isPreserved = true;
    let sp = {};
    if (data.sharePerformer && data.sharePerformer[0]) {
      sp[data.sharePerformer[0].domain] = [data.sharePerformer[0].login];
    } else {
      sp = null;
    }

    // сменить исполнителя (сохранить на сервере)
    this.tasksService.changePerformer({
      doc: this.document,
      performer: data.performer ? data.performer[0] : null,
      sharePerformer: sp
    })
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: any) => {
        // документ обновится по сокету и потом ngOnChanges
        this.state.isPreserved = false;
      });
  }

}
