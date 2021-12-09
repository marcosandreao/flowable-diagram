import { Component } from '@angular/core';
import { BpmnDraw } from './lib/bpmn-draw';
import { DOCUMENT } from '@angular/common';
import { Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { data } from 'jquery';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'diagram';

  constructor(@Inject(DOCUMENT) document: Document, private client: HttpClient) {
    // client.get('http://admin:test@localhost:8080/flowable-task/process-api/runtime/process-instances/72088648-584d-11ec-aa0b-0242ac110003/model-json?processDefinitionId=a:2:69f8c5f7-584d-11ec-aa0b-0242ac110003&nocaching=' + new Date().getTime()).subscribe(data => {
    //   console.log(data);
    // });

    client.get("http://localhost:8083/history/4f8dcc9a-5855-11ec-ad18-0242ac110003").subscribe(data => {
      console.log(data);
      BpmnDraw._showProcessDiagram(document, data);
    });

    // client.get('http://admin:test@localhost:8080/flowable-admin/app/rest/admin/process-instances/72088648-584d-11ec-aa0b-0242ac110003/model-json?processDefinitionId=a:2:69f8c5f7-584d-11ec-aa0b-0242ac110003&nocaching=1638986105282').subscribe(data => {
    //   console.log(data);
    // });

  }
}
