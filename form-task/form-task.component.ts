import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import * as _ from 'underscore';
import { takeUntil } from 'rxjs/operators';

import { TasksService, IHistory } from '../../../services/tasks.service';
import DiscusTask from '../../../models/discus-task';
import User from '../../../models/user';
import { DiscusService } from '../../../services/discus.service';
import { UsersService } from '../../../services/users.service';
import { AddParticipantsModalComponent } from '../../add-participants/add-participants-modal/add-participants-modal.component';
import { DocumentPrototypeComponent } from '../document-prototype/document-prototype.component';

@Component({
  selector: 'app-form-task',
  templateUrl: './form-task.component.html',
  styleUrls: ['./form-task.component.scss']
})
export class FormTaskComponent extends DocumentPrototypeComponent implements OnInit {
  document: DiscusTask;
  dialogRef: MatDialogRef<AddParticipantsModalComponent> | null;

  // список всех пользователей (для получения полной информации об участнике по username)
  allUsers: any;
  allShareUsers: User[];

  // ИСТОРИЯ ИЗМЕНЕНИЙ ПРОСЬБЫ
  history: IHistory[] = [];
  taskIsCompleted = false;

  // КНОПКИ
  showTaskPerformerComponent = false;
  showTaskDesireDateComponent = false;
  showTaskDateComponent = false;
  showTaskCancelComponent = false;
  showCompleteButton = false;
  showTakeToWorkButton = false;
  showToApplyButton = false;
  showToApplyCompleteButton = false;
  showCloseButton = false;
  showRejectButton = false;
  showCheckButton = false;
  showCancelButton = false;
  programmerSection = null;

  constructor(
    discusService: DiscusService,
    usersService: UsersService,
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer,
    private tasksService: TasksService
  ) {
    super(
      discusService,
      usersService,
      iconRegistry,
      sanitizer
    );
    this.iconRegistry.addSvgIconSetInNamespace
      ('task', this.sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/svg-sprite-task.svg'));
  }

  ngOnInit() {
    super.ngOnInit();

    // список всех пользователей своей компании по индексу = id
    this.allUsers = this.usersService.getUsersAllIndexBy();

    // список всех межпортальных пользователей
    this.allShareUsers = this.usersService.shareUsers;


    if (this.isMaindoc) {
      // подписаться на изменения документа (main-doc)
      this.discusService.mainDocChanges
        .pipe(takeUntil(this._destroyed))
        .subscribe((doc: DiscusTask) => {
          this.document = doc;
          this._initComponent();
        });
    } else {
      this._initComponent();

      // подписаться на unid комментария, который был изменен
      this.discusService.modifiedCommentUnidChanges
        .pipe(takeUntil(this._destroyed))
        .subscribe((unid: string) => {
          if (unid === this.document.unid) {
            this._initComponent();
          }
        });
    }
  }

  // инициализация компонента
  _initComponent(): void {
    // свойство tasking: { task, result } - хранит информацию о результатах и уточнениях к просьбе
    this.document.tasking = this.document.tasking || { task: [], result: [] };

    // отдел, в котором работает программист
    this.programmerSection = this.currentUser.determineProgrammerSection();

    // проверить условия вывода кнопок просьбы
    this.checkButtonShowConditions();

    // получить историю изменений
    this.getHistoryTask();
  }

  // проверить условия вывода кнопок просьбы
  checkButtonShowConditions(): void {
    if (this.document instanceof DiscusTask) {
      // просьба уведомлена?
      this.taskIsCompleted = this.document.isCompleted();

      // принять в работу
      this.showTakeToWorkButton = (!this.document.taskDateRealEnd || this.document.taskDateRealEnd === '') &&
        this.document.status === 'open' && this.currentUser.myNameIs(this.document.taskPerformerLat) &&
        this.document.TaskStateCurrent !== 10;

      // данные о желаемой дате (дата автора просьбы)
      this.showTaskDesireDateComponent = this.document.TaskStateCurrent !== 35 &&
        (!this.document.taskDateRealEnd || this.document.taskDateRealEnd === '') &&
        (!this.currentUser.myNameIs(this.document.taskPerformerLat) ||
          (this.currentUser.myNameIs(this.document.taskPerformerLat) && (this.document.taskDateEnd && this.document.taskDateEnd !== '')
          )
        );

      // данные об исполнителе
      this.showTaskPerformerComponent = this.document.TaskStateCurrent !== 35;

      // данные о дате
      this.showTaskDateComponent = this.document.TaskStateCurrent !== 35 &&
        (
          (this.currentUser.myNameIs(this.document.taskPerformerLat) && !this.showTakeToWorkButton) ||
          (!this.currentUser.myNameIs(this.document.taskPerformerLat) && !this.showTaskDesireDateComponent)
        ) || this.document.TaskStateCurrent === 15;

      // информация об отмене просьбы
      this.showTaskCancelComponent = this.document.TaskStateCurrent === 35;

      // уведомить об исполнении
      this.showCompleteButton = this.document.status === 'open' &&
        this.currentUser.myNameIs(this.document.taskPerformerLat) && !this.taskIsCompleted;

      // запросить накат
      this.showToApplyButton = this.programmerSection && this.document.status === 'open' && !this.taskIsCompleted &&
        this.currentUser.myNameIs(this.document.taskPerformerLat) && this.document.TaskStateCurrent !== 12;

      // выполнить накат
      this.showToApplyCompleteButton = this.programmerSection && this.document.status === 'open'
        && this.document.TaskStateCurrent === 12 && this.currentUser.myNameIs([this.document.responsible]);

      // принять исполнение
      this.showCloseButton = this.document.status === 'open' &&
        (!this.currentUser.myNameIs(this.document.taskPerformerLat) || this.currentUser.myNameIs(this.document.CheckerLat)) &&
        (this.currentUser.myNameIs([this.document.authorLogin]) || this.currentUser.myNameIs(this.document.CheckerLat) ||
          this.currentUser.hasRole(['PM']) || this.currentUser.isEscalManager(this.document.EscalationManagers)
        );

      // вернуть на доработку
      this.showRejectButton = this.document.taskPerformerLat && this.document.taskPerformerLat[0] !== 'Просьба подвешена' &&
        (this.taskIsCompleted || this.document.taskDateCompleted || this.document.TaskStateCurrent === 35) &&
        (
          this.currentUser.myNameIs(this.document.taskPerformerLat) || this.currentUser.myNameIs([this.document.authorLogin]) ||
          this.currentUser.myNameIs(this.document.CheckerLat) || this.currentUser.isEscalManager(this.document.EscalationManagers) ||
          this.currentUser.hasRole(['PM'])
        );

      // отдать на проверку
      this.showCheckButton = this.document.status === 'open' && this.taskIsCompleted && (
        this.currentUser.myNameIs([this.document.authorLogin]) || this.currentUser.myNameIs(this.document.CheckerLat) ||
        this.currentUser.isEscalManager(this.document.EscalationManagers)
      );

      // отменить
      this.showCancelButton = this.document.status === 'open' && (
        this.currentUser.myNameIs([this.document.authorLogin]) || this.currentUser.myNameIs(this.document.CheckerLat) ||
        this.currentUser.hasRole(['PM']) || this.currentUser.isEscalManager(this.document.EscalationManagers)
      );
    }
  }

  // получить историю изменений
  getHistoryTask(): void {
    if (this.document.taskHistories) {
      this.history = this.tasksService.getHistoryTask({
        taskHistory: this.document.taskHistories,
        doc: this.document
      });
    }
  }

  // уведомить об исполнении просьбы
  completeTask(): void {
    this.tasksService.completeTask({ doc: this.document })
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: any) => {
        // документ обновится по сокету в discus.component
      });
  }

  // запросить накат
  applyTask(): void {
    this.tasksService.applyTask({ doc: this.document, programmerSection: this.programmerSection })
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: any) => {
        // документ обновится по сокету в discus.component
      });
  }

  // выполнить накат
  applyCompleteTask(): void {
    this.tasksService.applyCompleteTask({ doc: this.document, programmerSection: this.programmerSection })
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: any) => {
        // документ обновится по сокету в discus.component
      });
  }

  // принять просьбу
  closeTask(): void {
    this.tasksService.closeTask({ doc: this.document })
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: any) => {
        // документ обновится по сокету в discus.component
      });
  }

  // отменить просьбу
  cancelTask(): void {
    this.tasksService.cancelTask({ doc: this.document })
      .pipe(takeUntil(this._destroyed))
      .subscribe((res: any) => {
        // документ обновится по сокету в discus.component
      });
  }

  // вернуть на доработку
  rejectTask(): void {
    const config: any = {
      data: {
        document: {
          form: 'messagebb',
          typeDoc: 'task',
          action: 'reject',
          taskID: this.document.unid,
          parentID: this.isMaindoc ? this.document.unid : this.document.parentID,
          subjectID: this.isMaindoc ? this.document.unid : this.document.parentID
        },
        parentDocument: this.document
      }
    };

    // Открыть окно для редактирования/создания документа
    this.discusService.showEditForm({ config: config, explicitEditing: true });
  }

  // отдать на проверку
  checkTask(): void {
    const config: any = {
      data: {
        document: {
          form: 'messagebb',
          typeDoc: 'task',
          action: 'check',
          taskID: this.document.unid,
          parentID: this.isMaindoc ? this.document.unid : this.document.parentID,
          subjectID: this.isMaindoc ? this.document.unid : this.document.parentID
        },
        parentDocument: this.document
      }
    };

    // Открыть окно для редактирования/создания документа
    this.discusService.showEditForm({ config: config, explicitEditing: true });
  }

  trackByFn(index) {
    return index;
  }

}
