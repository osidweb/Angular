import { Component, Inject, OnInit } from '@angular/core';
import { Moment } from 'moment';
import * as moment from 'moment';
import { PopupOverlayRef } from '../../../../../../services/popup-overlay/popup-overlay-ref';
import { POPUP_OVERLAY_DATA } from '../../../../../../services/popup-overlay/popup-overlay.token';

import DiscusTask from '../../../../../../models/discus-task';

export interface ITaskDatePanelData {
  document: DiscusTask;
}

export interface ITaskDatePanelModel {
  date: Moment | null;
}

@Component({
  selector: 'app-task-date-panel',
  templateUrl: './task-date-panel.component.html',
  styleUrls: ['./task-date-panel.component.scss']
})
export class TaskDatePanelComponent implements OnInit {
  // новые значения
  model: ITaskDatePanelModel = {
    date: null
  };

  // заголовок (срок MM DDD)
  dateInfo: string;
  // минимальный день при выборе даты(текущий день)
  minDate = new Date();

  constructor(
    @Inject(POPUP_OVERLAY_DATA) public data: ITaskDatePanelData,
    private popupOverlayRef: PopupOverlayRef
  ) { }

  ngOnInit(): void {
    const _date = this.data && this.data.document && (this.data.document.taskDateRealEnd || this.data.document.taskDateEnd)
      ? (this.data.document.taskDateRealEnd || this.data.document.taskDateEnd)
      : null;

    this.model.date = _date
      ? moment(_date)
      : null;

    this.dateInfo = this.model.date
      ? this.model.date.format('dd, DD MMMM YYYY')
      : null;
  }

  // выбрана новая дата
  selectedDate(): void {
    this.dateInfo = moment(this.model.date).format('dd, DD MMMM YYYY');
  }

  save(): void {
    const result: ITaskDatePanelModel = {
      date: this.model.date
    };

    this.popupOverlayRef.close(result);
  }

  close() {
    this.popupOverlayRef.close();
  }

}
