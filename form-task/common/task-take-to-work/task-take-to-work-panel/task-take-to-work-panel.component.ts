import { Component, Inject, OnInit } from '@angular/core';
import { Moment } from 'moment';
import * as moment from 'moment';
import DiscusTask from '../../../../../../models/discus-task';
import { PopupOverlayRef } from '../../../../../../services/popup-overlay/popup-overlay-ref';
import { POPUP_OVERLAY_DATA } from '../../../../../../services/popup-overlay/popup-overlay.token';

export interface ITaskTakeToWorkPanelData {
  document: DiscusTask;
}

export interface ITaskTakeToWorkPanelModel {
  date: Moment | null;
}

@Component({
  selector: 'app-task-take-to-work-panel',
  templateUrl: './task-take-to-work-panel.component.html',
  styleUrls: ['./task-take-to-work-panel.component.scss']
})
export class TaskTakeToWorkPanelComponent implements OnInit {
  // новые значения
  model: ITaskTakeToWorkPanelModel = {
    date: null
  };

  // заголовок (срок MM DDD)
  dateInfo: string;
  // минимальный день при выборе даты(текущий день)
  minDate = new Date();

  constructor(
    @Inject(POPUP_OVERLAY_DATA) public data: ITaskTakeToWorkPanelData,
    private popupOverlayRef: PopupOverlayRef
  ) { }

  ngOnInit(): void {

    this.model.date = this.data && this.data.document && this.data.document.taskDateRealEnd
      ? moment(this.data.document.taskDateRealEnd)
      : moment();

    this.dateInfo = this.model.date.format('dd, DD MMMM YYYY');
  }

  // выбрана новая дата
  selectedDate(): void {
    this.dateInfo = moment(this.model.date).format('dd, DD MMMM YYYY');
  }

  save(): void {
    const result: ITaskTakeToWorkPanelModel = {
      date: this.model.date
    };

    this.popupOverlayRef.close(result);
  }

  close() {
    this.popupOverlayRef.close();
  }

}
