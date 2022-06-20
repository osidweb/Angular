import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Moment } from 'moment';
import * as moment from 'moment';
import { PopupOverlayRef } from '../../../../../../services/popup-overlay/popup-overlay-ref';
import { POPUP_OVERLAY_DATA } from '../../../../../../services/popup-overlay/popup-overlay.token';
import { Subject } from 'rxjs';

export interface ITaskDesireDatePanelData {
  date: string | null;
}

export interface ITaskDesireDatePanelModel {
  date: Moment | null;
}

@Component({
  selector: 'app-task-desire-date-panel',
  templateUrl: './task-desire-date-panel.component.html',
  styleUrls: ['./task-desire-date-panel.component.scss']
})
export class TaskDesireDatePanelComponent implements OnInit, OnDestroy {

  model: ITaskDesireDatePanelModel = {
    date: null
  };

  // заголовок (срок MM DDD)
  dateInfo: string | null;
  // минимальный день при выборе даты(текущий день)
  minDate = new Date();
  _destroyed = new Subject();

  constructor(
    @Inject(POPUP_OVERLAY_DATA) public data: ITaskDesireDatePanelData,
    private popupOverlayRef: PopupOverlayRef
  ) { }

  ngOnInit(): void {
    this.model.date = this.data && this.data.date
      ? moment(this.data.date)
      : null;

    this.dateInfo = this.model.date
      ? this.model.date.format('dd, DD MMMM YYYY')
      : null;
  }

  ngOnDestroy() {
    this._destroyed.next(null);
    this._destroyed.complete();
  }

  // выбрана новая дата
  selectedDate() {
    this.dateInfo = moment(this.model.date).format('dd, DD MMMM YYYY');
  }

  // очистить желаемую дату
  clearDate() {
    this.model.date = null;
    this.dateInfo = null;
  }

  // закрыть панель
  close() {
    this.popupOverlayRef.close();
  }

  // сохранить желаемую дату
  save() {
    const result: ITaskDesireDatePanelModel = {
      date: this.model.date
    };

    this.popupOverlayRef.close(result);
  }

}
