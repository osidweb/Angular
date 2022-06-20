import { ConnectionPositionPair } from '@angular/cdk/overlay';
import { Component, Input, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, takeWhile } from 'rxjs/operators';
import * as moment from 'moment';

import DiscusTask from '../../../../../models/discus-task';
import { PopupOverlayService } from '../../../../../services/popup-overlay/popup-overlay.service';
import { ITaskTakeToWorkPanelModel, TaskTakeToWorkPanelComponent } from './task-take-to-work-panel/task-take-to-work-panel.component';
import { TasksService, ETaskAction } from '../../../../../services/tasks.service';

@Component({
  selector: 'app-task-take-to-work',
  templateUrl: './task-take-to-work.component.html',
  styleUrls: ['./task-take-to-work.component.scss']
})
export class TaskTakeToWorkComponent implements OnInit {
  @Input() document: DiscusTask;

  private _destroyed = new Subject();
  state = {
    // изменения сохраняются?
    isPreserved: false
  };

  constructor(
    private popupOverlayService: PopupOverlayService,
    private tasksService: TasksService
  ) { }

  ngOnInit(): void {
  }

  // принять в работу
  takeToWork(event: MouseEvent): void {
    if (this.state.isPreserved) {
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
      .open(TaskTakeToWorkPanelComponent, { data, positionStrategy })
      .afterClosed()
      .pipe(
        takeUntil(this._destroyed),
        takeWhile(result => !!result)
      )
      .subscribe((result: ITaskTakeToWorkPanelModel) => {
        if (result.date) {
          const newDate = moment(result.date).format('YYYYMMDD');
          this.changeDate(newDate);
        }
      });
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
