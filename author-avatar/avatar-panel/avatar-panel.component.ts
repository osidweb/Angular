import {Component, Inject, OnInit} from '@angular/core';
import {POPUP_OVERLAY_DATA} from '../../../services/popup-overlay/popup-overlay.token';
import {PopupOverlayRef} from '../../../services/popup-overlay/popup-overlay-ref';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';

export interface IAvatarPanelData {
  images: {
    smallImageUrl: string,
    bigImageUrl: string
  };
  authorLogin: string;
  authorName: string;
  authorWorkGroup: string;
  showPanelActions: boolean;
}

@Component({
  selector: 'app-avatar-panel',
  templateUrl: './avatar-panel.component.html',
  styleUrls: ['./avatar-panel.component.scss']
})
export class AvatarPanelComponent implements OnInit {
  workgroup: string;
  username: string;

  constructor(
    @Inject(POPUP_OVERLAY_DATA) public data: IAvatarPanelData,
    private popupOverlayRef: PopupOverlayRef,
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer
  ) {
    this.iconRegistry.addSvgIconSetInNamespace
    ('avatar', this.sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/svg-sprite-avatar.svg'));
  }

  ngOnInit(): void {
    this.username = this.data.authorName;
    this.workgroup = this.data.authorWorkGroup;
  }

  close() {
    this.popupOverlayRef.close();
  }
}
