import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-task-button',
  templateUrl: './task-button.component.html',
  styleUrls: ['./task-button.component.scss']
})
export class TaskButtonComponent implements OnInit {
  @Input() buttonTitle: string;
  @Output() taskButtonClickEvent = new EventEmitter<any>();

  state = {
    // изменения сохраняются?
    isPreserved: false
  };

  constructor() { }

  ngOnInit(): void {
  }

  // клик по кнопке
  taskButtonClick(): void {
    if (this.state.isPreserved) {
      return;
    }

    this.state.isPreserved = true;
    // передать данные в родительский компонент
    this.taskButtonClickEvent.emit();
  }

}
