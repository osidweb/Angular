import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import * as moment from 'moment';
import { ITaskHistory } from '../../../../../interfaces/itask-history';
import { IUserInfo, TasksService } from '../../../../../services/tasks.service';
import { ShortenNamePipe } from '../../../../../pipes/shorten-username.pipe';
import DiscusTask from '../../../../../models/discus-task';

interface ICancelHistory {
  text: string;
  isNew: boolean;
}

@Component({
  selector: 'app-task-cancel',
  templateUrl: './task-cancel.component.html',
  styleUrls: ['./task-cancel.component.scss']
})
export class TaskCancelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() history: ITaskHistory[];
  @Input() document: DiscusTask;

  taskCancelHistory: ICancelHistory;
  _destroyed = new Subject();

  constructor(
    private tasksService: TasksService,
    private translateService: TranslateService,
    private shortenName: ShortenNamePipe
  ) { }

  ngOnInit(): void {
    this.taskCancelHistory = this.getCancelHistory();
  }

  ngOnChanges(changes: SimpleChanges) {
    // обновить запись об отмене просьбы, если изменилась последняя запись в истории просьбы
    if (changes && changes.history && changes.history.currentValue) {
      this.taskCancelHistory = this.getCancelHistory();
    }
  }

  ngOnDestroy() {
    this._destroyed.next(null);
    this._destroyed.complete();
  }

  getCancelHistory(): ICancelHistory {
    let _text = '',
      _new = false;

    if (this.history && this.history.length > 0) {
      const th: ITaskHistory = this.history[this.history.length - 1];

      if (th.type === 'status' && (th.value.type === 'cancelled' || th.value.type === 'cancel')) {
        let transTextStatus = '';
        const statusUserInfo: IUserInfo = this.tasksService.getUserNameAndGenderForHistoryTask({
          autorLogin: th.authorLogin,
          domain: th.domain
        });

        const dateCreated = moment(th.created),
          today = new Date(),
          formattedDateCreated = (today.getFullYear() === dateCreated.year())
          ? dateCreated.format('DD MMM')
          : dateCreated.format('DD.MM.YYYY');

        this.translateService.get('taskHistoryText.status_cancel', { gender: statusUserInfo.gender })
          .pipe(takeUntil(this._destroyed))
          .subscribe((res: string) => {
            transTextStatus = res;
          });

        _text += this.shortenName.transform(statusUserInfo.name) + ' ' + transTextStatus + ' ' + formattedDateCreated;
        _new = this.tasksService.isNew(th, this.document);
      }
    }

    return {
      text: _text,
      isNew: _new
    };
  }

}
