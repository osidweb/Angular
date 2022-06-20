import { Component, Inject, OnInit } from '@angular/core';

import { IShareModel } from '../../../../../../interfaces/ishare-model';
import DiscusTask from '../../../../../../models/discus-task';
import User from '../../../../../../models/user';
import { PopupOverlayRef } from '../../../../../../services/popup-overlay/popup-overlay-ref';
import { POPUP_OVERLAY_DATA } from '../../../../../../services/popup-overlay/popup-overlay.token';

export interface ITaskPerformerPanelData {
  document: DiscusTask;
  performer: string | null;
  sharePerformer: IShareModel | null;
  users: User[];
}

export interface ITaskPerformerModel {
  performer: string[] | null;
  sharePerformer: IShareModel[] | null;
}

@Component({
  selector: 'app-task-performer-panel',
  templateUrl: './task-performer-panel.component.html',
  styleUrls: ['./task-performer-panel.component.scss']
})
export class TaskPerformerPanelComponent implements OnInit {

  // новые значения
  model: ITaskPerformerModel;

  constructor(
    @Inject(POPUP_OVERLAY_DATA) public data: ITaskPerformerPanelData,
    private popupOverlayRef: PopupOverlayRef,
  ) { }

  ngOnInit(): void {
    this.model = {
      performer: this.data && this.data.performer ? [this.data.performer] : [],
      sharePerformer: this.data && this.data.sharePerformer ? [this.data.sharePerformer] : []
    };
  }

  // выбран исполнитель
  selectedPerformer(newPerformer: string[]) {
    this.model.performer = newPerformer;
  }

  // выбран межпортальный исполнитель
  selectedSharePerformer(newSharePerformer: IShareModel[]) {
    this.model.sharePerformer = newSharePerformer;
  }

  // сохранить изменения
  save(): void {
    const result: ITaskPerformerModel = {
      performer: this.isChangedPerformer() ? this.model.performer : null,
      sharePerformer: this.isChangedSharePerformer() ? this.model.sharePerformer : null
    };

    this.popupOverlayRef.close(result);
  }

  // закрыть панель
  close(): void {
    this.popupOverlayRef.close();
  }

  // изменился исполнитель?
  isChangedPerformer(): boolean {
    return this.model.performer && this.model.performer.length > 0 &&
      this.model.performer[0] !== this.data.performer;
  }

  // изменился межпортальный исполнитель?
  isChangedSharePerformer(): boolean {
    return this.model.sharePerformer && this.model.sharePerformer.length > 0 &&
      (!this.data.sharePerformer ||
        (this.data.sharePerformer && this.data.sharePerformer.login &&
          this.model.sharePerformer[0].login !== this.data.sharePerformer.login)
      );
  }

}
