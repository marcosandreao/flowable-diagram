import { Polyline } from "./polyline";
import Raphael from 'raphael';
import * as $ from 'jquery';

/* Copyright 2005-2015 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export class BpmnDraw {
	ignoreTip = true;
	elementsAdded = new Array();
	elementsRemoved = new Array();
	changeStateStartElementIds = new Array();
	changeStateStartElements = new Array();
	changeStateStartGlowElements = new Array();
	changeStateEndElementIds = new Array();
	changeStateEndElements = new Array();
	changeStateEndGlowElements = new Array();

	migrationMappedElements = new Array();
	migrationMappedElementsText = new Array();
	collapsedItemNavigation = new Array();

	viewBoxWidth: number = 0;
	viewBoxHeight: number = 0;

	canvasWidth: number = 0;
	canvasHeight: number = 0;

	constructor(
		private paper: any,
		private bpmnData: any,
		private setting: any) {
		this.canvasWidth = setting.INITIAL_CANVAS_WIDTH;
		this.canvasHeight = setting.INITIAL_CANVAS_HEIGHT;
		this.viewBoxWidth = setting.INITIAL_CANVAS_WIDTH;
		this.viewBoxHeight = setting.INITIAL_CANVAS_HEIGHT;
	}

	_bpmnGetColor(element: any, defaultColor: any) {
		var strokeColor;
		if (element.current) {
			strokeColor = this.setting.CURRENT_COLOR;
		} else if (element.completed) {
			strokeColor = this.setting.COMPLETED_COLOR;
		} else {
			strokeColor = defaultColor;
		}
		return strokeColor;
	}

	_drawPool(pool: any, isMigrationModelElement: any, currentPaper: any) {
		var rect = currentPaper.rect(pool.x, pool.y, pool.width, pool.height);

		rect.attr({
			"stroke-width": 1,
			"stroke": this.setting.MAIN_STROKE_COLOR,
			"fill": "white"
		});

		if (pool.name) {
			var poolName = currentPaper.text(pool.x + 14, pool.y + (pool.height / 2), pool.name).attr({
				"text-anchor": "middle",
				"font-family": "Arial",
				"font-size": "12",
				"fill": this.setting.MAIN_STROKE_COLOR
			});

			poolName.transform("r270");
		}

		if (pool.lanes) {
			for (var i = 0; i < pool.lanes.length; i++) {
				var lane = pool.lanes[i];
				this._drawLane(lane, isMigrationModelElement, currentPaper);
			}
		}
	}

	_drawLane(lane: any, isMigrationModelElement: any, currentPaper: any) {
		var rect = currentPaper.rect(lane.x, lane.y, lane.width, lane.height);

		rect.attr({
			"stroke-width": 1,
			"stroke": this.setting.MAIN_STROKE_COLOR,
			"fill": "white"
		});

		if (lane.name) {
			var laneName = currentPaper.text(lane.x + 10, lane.y + (lane.height / 2), lane.name).attr({
				"text-anchor": "middle",
				"font-family": "Arial",
				"font-size": "12",
				"fill": this.setting.MAIN_STROKE_COLOR
			});

			laneName.transform("r270");
		}
	}

	_drawSubProcess(element: any, isMigrationModelElement: any, currentPaper: any) {
		var rect = currentPaper.rect(element.x, element.y, element.width, element.height, 4);

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		rect.attr({
			"stroke-width": 1,
			"stroke": strokeColor,
			"fill": "white"
		});

		if (element.collapsed) {
			if (element.name) {
				this._drawMultilineText(element.name, element.x, element.y, element.width, element.height, "middle", "middle", 11,
					this._bpmnGetColor(element, this.setting.TEXT_COLOR), currentPaper);
			}

			rect.click(() => {
				this._expandCollapsedElement(element);
			});
		}
	}

	_drawTransaction(element: any) {
		var rect = this.paper.rect(element.x, element.y, element.width, element.height, 4);

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		rect.attr({
			"stroke-width": 1,
			"stroke": strokeColor,
			"fill": "white"
		});

		var borderRect = this.paper.rect(element.x + 2, element.y + 2, element.width - 4, element.height - 4, 4);

		borderRect.attr({
			"stroke-width": 1,
			"stroke": "black",
			"fill": "none"
		});
	}

	_drawEventSubProcess(element: any, isMigrationModelElement: any, currentPaper: any) {
		var rect = currentPaper.rect(element.x, element.y, element.width, element.height, 4);
		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		rect.attr({
			"stroke-width": 2,
			"stroke": strokeColor,
			"stroke-dasharray": ".",
			"fill": "white"
		});
	}

	_drawEvent(element: any, strokeWidth: any, radius: any, currentPaper: any) {
		var x = element.x + (element.width / 2);
		var y = element.y + (element.height / 2);

		var circle = currentPaper.circle(x, y, radius);

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);
		circle.attr({
			"stroke-width": strokeWidth,
			"stroke": strokeColor,
			"fill": "#ffffff"
		});

		circle.id = element.id;

		this._drawEventIcon(currentPaper, element);

		return circle;
	}
	_drawStartEvent(element: any, isMigrationModelElement: any, currentPaper: any) {
		var startEvent = this._drawEvent(element, this.setting.NORMAL_STROKE, 15, currentPaper);
		startEvent.click(() => {
			this._zoom(true);
		});
		this._addHoverLogic(element, "circle", this.setting.MAIN_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawEndEvent(element: any, isMigrationModelElement: any, currentPaper: any) {
		var endEvent = this._drawEvent(element, this.setting.MAIN_STROKE_COLOR, 14, currentPaper);
		endEvent.click(() => {
			this._zoom(false);
		});
		this._addHoverLogic(element, "circle", this.setting.MAIN_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}


	_drawServiceTask(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawTask(element, currentPaper);
		if (element.taskType === "mail") {
			this._drawSendTaskIcon(currentPaper, element.x - 4, element.y - 4, element);

		} else if (element.taskType === "camel") {
			this._drawCamelTaskIcon(currentPaper, element.x + 4, element.y + 4);

		} else if (element.taskType === "mule") {
			this._drawMuleTaskIcon(currentPaper, element.x + 4, element.y + 4);

		} else if (element.taskType === "http") {
			this._drawHttpTaskIcon(currentPaper, element.x + 4, element.y + 4);

		} else if (element.taskType === "dmn") {
			this._drawDecisionTaskIcon(currentPaper, element.x + 4, element.y + 4);

		} else if (element.taskType === "shell") {
			this._drawShellTaskIcon(currentPaper, element.x + 4, element.y + 4);

		} else if (element.stencilIconId) {
			currentPaper.image("../service/stencilitem/" + element.stencilIconId + "/icon", element.x + 4, element.y + 4, 16, 16);

		} else {
			this._drawServiceTaskIcon(currentPaper, element.x + 4, element.y + 4, element);
		}
		this._addHoverLogic(element, "rect", this.setting.ACTIVITY_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawHttpServiceTask(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawTask(element, currentPaper);
		this._drawHttpTaskIcon(currentPaper, element.x + 4, element.y + 4);
		this._addHoverLogic(element, "rect", this.setting.ACTIVITY_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawCallActivity(element: any, isMigrationModelElement: any, currentPaper: any) {
		var width = element.width - (this.setting.CALL_ACTIVITY_STROKE / 2);
		var height = element.height - (this.setting.CALL_ACTIVITY_STROKE / 2);

		var rect = currentPaper.rect(element.x, element.y, width, height, 4);


		var strokeColor = this._bpmnGetColor(element, this.setting.ACTIVITY_STROKE_COLOR);

		rect.attr({
			"stroke-width": this.setting.CALL_ACTIVITY_STROKE,
			"stroke": strokeColor,
			"fill": this.setting.ACTIVITY_FILL_COLOR
		});

		rect.id = element.id;

		if (element.name) {
			this._drawMultilineText(element.name, element.x, element.y, element.width, element.height, "middle", "middle", 11, null, currentPaper);
		}
		this._addHoverLogic(element, "rect", this.setting.ACTIVITY_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawTask(element: any, currentPaper: any) {
		var width = element.width - (this.setting.TASK_STROKE / 2);
		var height = element.height - (this.setting.TASK_STROKE / 2);

		var rect = currentPaper.rect(element.x, element.y, width, height, 4);


		var strokeColor = this._bpmnGetColor(element, this.setting.ACTIVITY_STROKE_COLOR);
		var strokeWidth = element.current ? this.setting.CURRENT_ACTIVITY_STROKE : this.setting.TASK_STROKE;
		rect.attr({
			"stroke-width": strokeWidth,
			"stroke": strokeColor,
			"fill": this.setting.ACTIVITY_FILL_COLOR
		});

		rect.id = element.id;

		if (element.name) {
			this._drawMultilineText(element.name, element.x, element.y, element.width, element.height, "middle", "middle", 11,
				this._bpmnGetColor(element, this.setting.TEXT_COLOR), currentPaper);
		}
	}

	_drawScriptTask(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawTask(element, currentPaper);
		this._drawScriptTaskIcon(currentPaper, element.x + 4, element.y + 4, element);
		this._addHoverLogic(element, "rect", this.setting.ACTIVITY_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawUserTask(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawTask(element, currentPaper);
		this._drawUserTaskIcon(currentPaper, element.x + 4, element.y + 4, element);
		this._addHoverLogic(element, "rect", this.setting.ACTIVITY_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawBusinessRuleTask(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawTask(element, currentPaper);
		this._drawBusinessRuleTaskIcon(currentPaper, element.x + 4, element.y + 4, element);
		this._addHoverLogic(element, "rect", this.setting.ACTIVITY_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawManualTask(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawTask(element, currentPaper);
		this._drawManualTaskIcon(currentPaper, element.x + 4, element.y + 4, element);
		this._addHoverLogic(element, "rect", this.setting.ACTIVITY_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawReceiveTask(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawTask(element, currentPaper);
		this._drawReceiveTaskIcon(currentPaper, element.x, element.y, element);
		this._addHoverLogic(element, "rect", this.setting.ACTIVITY_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawExclusiveGateway(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawGateway(element, currentPaper);
		var quarterWidth = element.width / 4;
		var quarterHeight = element.height / 4;

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		var iks = currentPaper.path(
			"M" + (element.x + quarterWidth + 3) + " " + (element.y + quarterHeight + 3) +
			"L" + (element.x + 3 * quarterWidth - 3) + " " + (element.y + 3 * quarterHeight - 3) +
			"M" + (element.x + quarterWidth + 3) + " " + (element.y + 3 * quarterHeight - 3) +
			"L" + (element.x + 3 * quarterWidth - 3) + " " + (element.y + quarterHeight + 3)
		);
		iks.attr({ "stroke-width": 3, "stroke": strokeColor });

		this._addHoverLogic(element, "rhombus", this.setting.MAIN_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawParallelGateway(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawGateway(element, currentPaper);

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		var path1 = currentPaper.path("M 6.75,16 L 25.75,16 M 16,6.75 L 16,25.75");
		path1.attr({
			"stroke-width": 3,
			"stroke": strokeColor,
			"fill": "none"
		});

		path1.transform("T" + (element.x + 4) + "," + (element.y + 4));

		this._addHoverLogic(element, "rhombus", this.setting.MAIN_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawInclusiveGateway(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawGateway(element, currentPaper);

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		var circle1 = currentPaper.circle(element.x + (element.width / 2), element.y + (element.height / 2), 9.75);
		circle1.attr({
			"stroke-width": 2.5,
			"stroke": strokeColor,
			"fill": "none"
		});

		this._addHoverLogic(element, "rhombus", this.setting.MAIN_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawEventGateway(element: any, isMigrationModelElement: any, currentPaper: any) {
		this._drawGateway(element, currentPaper);

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		var circle1 = currentPaper.circle(element.x + (element.width / 2), element.y + (element.height / 2), 10.4);
		circle1.attr({
			"stroke-width": 0.5,
			"stroke": strokeColor,
			"fill": "none"
		});

		var circle2 = currentPaper.circle(element.x + (element.width / 2), element.y + (element.height / 2), 11.7);
		circle2.attr({
			"stroke-width": 0.5,
			"stroke": strokeColor,
			"fill": "none"
		});

		var path1 = currentPaper.path("M 20.327514,22.344972 L 11.259248,22.344216 L 8.4577203,13.719549 L 15.794545,8.389969 L 23.130481,13.720774 L 20.327514,22.344972 z");
		path1.attr({
			"stroke-width": 1.39999998,
			"stroke": strokeColor,
			"fill": "none",
			"stroke-linejoin": "bevel"
		});

		path1.transform("T" + (element.x + 4) + "," + (element.y + 4));

		this._addHoverLogic(element, "rhombus", this.setting.MAIN_STROKE_COLOR, isMigrationModelElement, currentPaper);
	}

	_drawGateway(element: any, currentPaper: any) {
		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		var rhombus = currentPaper.path("M" + element.x + " " + (element.y + (element.height / 2)) +
			"L" + (element.x + (element.width / 2)) + " " + (element.y + element.height) +
			"L" + (element.x + element.width) + " " + (element.y + (element.height / 2)) +
			"L" + (element.x + (element.width / 2)) + " " + element.y + "z"
		);

		rhombus.attr("stroke-width", 2);
		rhombus.attr("stroke", strokeColor);
		rhombus.attr({ fill: "#ffffff" });

		rhombus.id = element.id;

		return rhombus;
	}

	_drawBoundaryEvent(element: any, isMigrationModelElement: any, currentPaper: any) {
		var x = element.x + (element.width / 2);
		var y = element.y + (element.height / 2);

		var circle = currentPaper.circle(x, y, 15);

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		circle.attr({
			"stroke-width": 1,
			"stroke": strokeColor,
			"fill": "white"
		});

		var innerCircle = currentPaper.circle(x, y, 12);

		innerCircle.attr({
			"stroke-width": 1,
			"stroke": strokeColor,
			"fill": "none"
		});

		this._drawEventIcon(currentPaper, element);
		this._addHoverLogic(element, "circle", this.setting.MAIN_STROKE_COLOR, isMigrationModelElement, currentPaper);

		circle.id = element.id;
		innerCircle.id = element.id + "_inner";
	}

	_drawIntermediateCatchEvent(element: any, isMigrationModelElement: any, currentPaper: any) {
		var x = element.x + (element.width / 2);
		var y = element.y + (element.height / 2);

		var circle = currentPaper.circle(x, y, 15);

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		circle.attr({
			"stroke-width": 1,
			"stroke": strokeColor,
			"fill": "white"
		});

		var innerCircle = currentPaper.circle(x, y, 12);

		innerCircle.attr({
			"stroke-width": 1,
			"stroke": strokeColor,
			"fill": "none"
		});

		this._drawEventIcon(currentPaper, element);
		this._addHoverLogic(element, "circle", this.setting.MAIN_STROKE_COLOR, isMigrationModelElement, currentPaper);

		circle.id = element.id;
		innerCircle.id = element.id + "_inner";
	}

	_drawThrowEvent(element: any, isMigrationModelElement: any, currentPaper: any) {
		var x = element.x + (element.width / 2);
		var y = element.y + (element.height / 2);

		var circle = currentPaper.circle(x, y, 15);

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		circle.attr({
			"stroke-width": 1,
			"stroke": strokeColor,
			"fill": "white"
		});

		var innerCircle = currentPaper.circle(x, y, 12);

		innerCircle.attr({
			"stroke-width": 1,
			"stroke": strokeColor,
			"fill": "none"
		});

		this._drawEventIcon(currentPaper, element);
		this._addHoverLogic(element, "circle", this.setting.MAIN_STROKE_COLOR, isMigrationModelElement, currentPaper);

		circle.id = element.id;
		innerCircle.id = element.id + "_inner";
	}

	_drawMultilineText(text: any, x: any, y: any, boxWidth: any, boxHeight: any, horizontalAnchor: any,
		verticalAnchor: any, fontSize: any, color: any, currentPaper: any) {
		if (!text || text == "") {
			return;
		}

		var textBoxX = 0, textBoxY;
		var width = boxWidth - (2 * this.setting.TEXT_PADDING);

		if (horizontalAnchor === "middle") {
			textBoxX = x + (boxWidth / 2);
		}
		else if (horizontalAnchor === "start") {
			textBoxX = x;
		}

		textBoxY = y + (boxHeight / 2);

		if (!color) {
			color = this.setting.TEXT_COLOR;
		}
		var t = currentPaper.text(textBoxX + this.setting.TEXT_PADDING, textBoxY + this.setting.TEXT_PADDING).attr({
			"text-anchor": horizontalAnchor,
			"font-family": "Arial",
			"font-size": fontSize,
			"fill": color
		});

		var abc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
		t.attr({
			"text": abc
		});
		var letterWidth = t.getBBox().width / abc.length;

		t.attr({
			"text": text
		});
		var removedLineBreaks = text.split("\n");
		var _x = 0, s = [];
		for (var r = 0; r < removedLineBreaks.length; r++) {
			var words = removedLineBreaks[r].split(" ");
			for (var i = 0; i < words.length; i++) {

				var l = words[i].length;
				if (_x + (l * letterWidth) > width) {
					s.push("\n");
					_x = 0;
				}
				_x += l * letterWidth;
				s.push(words[i] + " ");
			}
			s.push("\n");
			_x = 0;
		}
		t.attr({
			"text": s.join("")
		});

		if (verticalAnchor && verticalAnchor === "top") {
			t.attr({ "y": y + (t.getBBox().height / 2) });
		}
	}

	_drawTextAnnotation(element: any, isMigrationModelElement: any, currentPaper: any) {
		var path1 = currentPaper.path("M20,1 L1,1 L1,50 L20,50");
		path1.attr({
			"stroke": "#585858",
			"fill": "none"
		});

		var annotation = currentPaper.set();
		annotation.push(path1);

		annotation.transform("T" + element.x + "," + element.y);

		if (element.text) {
			this._drawMultilineText(element.text, element.x + 2, element.y, element.width, element.height, "start",
				"middle", 11, this._bpmnGetColor(element, this.setting.TEXT_COLOR), currentPaper);
		}
	}

	_drawFlow(flow: any, currentPaper: any = null) {

		if (currentPaper == null) {
			currentPaper = this.paper;
		}
		var polyline = new Polyline(flow.id, flow.waypoints, this.setting.SEQUENCEFLOW_STROKE, currentPaper);
		polyline.init([]);

		var strokeColor = this._bpmnGetColor(flow, this.setting.MAIN_STROKE_COLOR);

		polyline.element = currentPaper.path(polyline.path);
		polyline.element.attr({ "stroke-width": this.setting.SEQUENCEFLOW_STROKE });
		polyline.element.attr({ "stroke": strokeColor });

		polyline.element.id = flow.id;

		var lastLineIndex = polyline.getLinesCount() - 1;
		var line = polyline.getLine(lastLineIndex);

		if (flow.type == "connection" && flow.conditions) {
			var middleX = (line.x1 + line.x2) / 2;
			var middleY = (line.y1 + line.y2) / 2;
			var image = currentPaper.image("../editor/images/condition-flow.png", middleX - 8, middleY - 8, 16, 16);
		}

		var polylineInvisible = new Polyline(flow.id, flow.waypoints, this.setting.SEQUENCEFLOW_STROKE, currentPaper);
		polylineInvisible.init([])
		polylineInvisible.element = currentPaper.path(polyline.path);
		polylineInvisible.element.attr({
			"opacity": 0,
			"stroke-width": 8,
			"stroke": "#000000"
		});

		if (flow.name) {
			var firstLine = polyline.getLine(0);

			var angle;
			if (firstLine.x1 !== firstLine.x2) {
				angle = Math.atan((firstLine.y2 - firstLine.y1) / (firstLine.x2 - firstLine.x1));
			} else if (firstLine.y1 < firstLine.y2) {
				angle = Math.PI / 2;
			} else {
				angle = -Math.PI / 2;
			}
			var flowName = currentPaper.text(firstLine.x1, firstLine.y1, flow.name).attr({
				"text-anchor": "middle",
				"font-family": "Arial",
				"font-size": "12",
				"fill": "#000000"
			});

			var offsetX = (flowName.getBBox().width / 2 + 5);
			var offsetY = -(flowName.getBBox().height / 2 + 5);

			if (firstLine.x1 > firstLine.x2) {
				offsetX = -offsetX;
			}
			var rotatedOffsetX = offsetX * Math.cos(angle) - offsetY * Math.sin(angle);
			var rotatedOffsetY = offsetX * Math.sin(angle) + offsetY * Math.cos(angle);

			flowName.attr({
				x: firstLine.x1 + rotatedOffsetX,
				y: firstLine.y1 + rotatedOffsetY
			});

			flowName.transform("r" + ((angle) * 180) / Math.PI);
		}

		this._showTip($(polylineInvisible.element.node), flow);

		polylineInvisible.element.mouseover(() => {
			currentPaper.getById(polyline.element.id).attr({ "stroke": this.setting.HOVER_COLOR });
		});

		polylineInvisible.element.mouseout(() => {
			currentPaper.getById(polyline.element.id).attr({ "stroke": strokeColor });
		});

		this._drawArrowHead(line, strokeColor, currentPaper);
	}

	_drawAssociation(flow: any, currentPaper: any) {

		var polyline = new Polyline(flow.id, flow.waypoints, this.setting.ASSOCIATION_STROKE, this.paper);
		polyline.init([]);
		var strokeColor = this._bpmnGetColor(flow, this.setting.MAIN_STROKE_COLOR);

		polyline.element = currentPaper.path(polyline.path);
		polyline.element.attr({ "stroke-width": this.setting.ASSOCIATION_STROKE });
		polyline.element.attr({ "stroke-dasharray": ". " });
		polyline.element.attr({ "stroke": strokeColor });

		polyline.element.id = flow.id;

		var polylineInvisible = new Polyline(flow.id, flow.waypoints, this.setting.ASSOCIATION_STROKE, this.paper);
		polylineInvisible.init([]);
		polylineInvisible.element = currentPaper.path(polyline.path);
		polylineInvisible.element.attr({
			"opacity": 0,
			"stroke-width": 8,
			"stroke": "#000000"
		});

		this._showTip(jQuery(polylineInvisible.element.node), flow);

		polylineInvisible.element.mouseover(() => {
			currentPaper.getById(polyline.element.id).attr({ "stroke": this.setting.HOVER_COLOR });
		});

		polylineInvisible.element.mouseout(() => {
			currentPaper.getById(polyline.element.id).attr({ "stroke": strokeColor });
		});
	}

	_drawArrowHead(line: any, color: any, currentPaper: any) {
		var doubleArrowWidth = 2 * this.setting.ARROW_WIDTH;

		var arrowHead = currentPaper.path("M0 0L-" + (this.setting.ARROW_WIDTH / 2 + .5) + " -" + doubleArrowWidth + "L" + (this.setting.ARROW_WIDTH / 2 + .5) + " -" + doubleArrowWidth + "z");

		// anti smoothing
		if (this.setting.ARROW_WIDTH % 2 == 1)
			line.x2 += .5, line.y2 += .5;

		arrowHead.transform("t" + line.x2 + "," + line.y2 + "");
		arrowHead.transform("...r" + Raphael.deg(line.angle - Math.PI / 2) + " " + 0 + " " + 0);

		arrowHead.attr("fill", color);

		arrowHead.attr("stroke-width", this.setting.SEQUENCEFLOW_STROKE);
		arrowHead.attr("stroke", color);

		return arrowHead;
	}

	/**
	 * bpmn-icons.js
	 */


	_drawUserTaskIcon(paper: any, startX: any, startY: any, element: any) {

		var color = this._bpmnGetColor(element, "#000000");
		var path1 = paper.path("m 1,17 16,0 0,-1.7778 -5.333332,-3.5555 0,-1.7778 c 1.244444,0 1.244444,-2.3111 1.244444,-2.3111 l 0,-3.0222 C 12.555557,0.8221 9.0000001,1.0001 9.0000001,1.0001 c 0,0 -3.5555556,-0.178 -3.9111111,3.5555 l 0,3.0222 c 0,0 0,2.3111 1.2444443,2.3111 l 0,1.7778 L 1,15.2222 1,17 17,17");
		path1.attr({
			"opacity": 1,
			"stroke": "none",
			"fill": color
		});

		var userTaskIcon = paper.set();
		userTaskIcon.push(path1);

		userTaskIcon.transform("T" + startX + "," + startY);
	}

	_drawServiceTaskIcon(paper: any, startX: any, startY: any, element: any) {
		var color = this._bpmnGetColor(element, "#000000");
		var path1 = paper.path("M 8,1 7.5,2.875 c 0,0 -0.02438,0.250763 -0.40625,0.4375 C 7.05724,3.330353 7.04387,3.358818 7,3.375 6.6676654,3.4929791 6.3336971,3.6092802 6.03125,3.78125 6.02349,3.78566 6.007733,3.77681 6,3.78125 5.8811373,3.761018 5.8125,3.71875 5.8125,3.71875 l -1.6875,-1 -1.40625,1.4375 0.96875,1.65625 c 0,0 0.065705,0.068637 0.09375,0.1875 0.002,0.00849 -0.00169,0.022138 0,0.03125 C 3.6092802,6.3336971 3.4929791,6.6676654 3.375,7 3.3629836,7.0338489 3.3239228,7.0596246 3.3125,7.09375 3.125763,7.4756184 2.875,7.5 2.875,7.5 L 1,8 l 0,2 1.875,0.5 c 0,0 0.250763,0.02438 0.4375,0.40625 0.017853,0.03651 0.046318,0.04988 0.0625,0.09375 0.1129372,0.318132 0.2124732,0.646641 0.375,0.9375 -0.00302,0.215512 -0.09375,0.34375 -0.09375,0.34375 L 2.6875,13.9375 4.09375,15.34375 5.78125,14.375 c 0,0 0.1229911,-0.09744 0.34375,-0.09375 0.2720511,0.147787 0.5795915,0.23888 0.875,0.34375 0.033849,0.01202 0.059625,0.05108 0.09375,0.0625 C 7.4756199,14.874237 7.5,15.125 7.5,15.125 L 8,17 l 2,0 0.5,-1.875 c 0,0 0.02438,-0.250763 0.40625,-0.4375 0.03651,-0.01785 0.04988,-0.04632 0.09375,-0.0625 0.332335,-0.117979 0.666303,-0.23428 0.96875,-0.40625 0.177303,0.0173 0.28125,0.09375 0.28125,0.09375 l 1.65625,0.96875 1.40625,-1.40625 -0.96875,-1.65625 c 0,0 -0.07645,-0.103947 -0.09375,-0.28125 0.162527,-0.290859 0.262063,-0.619368 0.375,-0.9375 0.01618,-0.04387 0.04465,-0.05724 0.0625,-0.09375 C 14.874237,10.52438 15.125,10.5 15.125,10.5 L 17,10 17,8 15.125,7.5 c 0,0 -0.250763,-0.024382 -0.4375,-0.40625 C 14.669647,7.0572406 14.641181,7.0438697 14.625,7 14.55912,6.8144282 14.520616,6.6141566 14.4375,6.4375 c -0.224363,-0.4866 0,-0.71875 0,-0.71875 L 15.40625,4.0625 14,2.625 l -1.65625,1 c 0,0 -0.253337,0.1695664 -0.71875,-0.03125 l -0.03125,0 C 11.405359,3.5035185 11.198648,3.4455201 11,3.375 10.95613,3.3588185 10.942759,3.3303534 10.90625,3.3125 10.524382,3.125763 10.5,2.875 10.5,2.875 L 10,1 8,1 z m 1,5 c 1.656854,0 3,1.3431458 3,3 0,1.656854 -1.343146,3 -3,3 C 7.3431458,12 6,10.656854 6,9 6,7.3431458 7.3431458,6 9,6 z");
		path1.attr({
			"opacity": 1,
			"stroke": "none",
			"fill": color
		});

		var serviceTaskIcon = paper.set();
		serviceTaskIcon.push(path1);

		serviceTaskIcon.transform("T" + startX + "," + startY);
	}

	_drawScriptTaskIcon(paper: any, startX: any, startY: any, element: any) {
		var color = this._bpmnGetColor(element, "#000000");
		var path1 = paper.path("m 5,2 0,0.094 c 0.23706,0.064 0.53189,0.1645 0.8125,0.375 0.5582,0.4186 1.05109,1.228 1.15625,2.5312 l 8.03125,0 1,0 1,0 c 0,-3 -2,-3 -2,-3 l -10,0 z M 4,3 4,13 2,13 c 0,3 2,3 2,3 l 9,0 c 0,0 2,0 2,-3 L 15,6 6,6 6,5.5 C 6,4.1111 5.5595,3.529 5.1875,3.25 4.8155,2.971 4.5,3 4.5,3 L 4,3 z");
		path1.attr({
			"opacity": 1,
			"stroke": "none",
			"fill": color
		});

		var scriptTaskIcon = paper.set();
		scriptTaskIcon.push(path1);

		scriptTaskIcon.transform("T" + startX + "," + startY);
	}

	_drawBusinessRuleTaskIcon(paper: any, startX: any, startY: any, element: any) {
		var color = this._bpmnGetColor(element, "#000000");
		var rect1 = paper.rect(0, 0, 22, 4);
		rect1.attr({
			"stroke": "#000000",
			"fill": color
		});

		var rect2 = paper.rect(0, 4, 22, 12);
		rect2.attr({
			"stroke": "#000000",
			"fill": "none"
		});

		var path1 = paper.path("M 0 10 L 22 10");
		path1.attr({
			"stroke": "#000000",
			"fill": "none"
		});

		var path2 = paper.path("M 7 4 L 7 16");
		path2.attr({
			"stroke": "#000000",
			"fill": "none"
		});

		var businessRuleTaskIcon = paper.set();
		businessRuleTaskIcon.push(rect1, rect2, path1, path2);

		businessRuleTaskIcon.transform("S0.7,0.7,0,0 T" + startX + "," + startY);
	}

	_drawSendTaskIcon(paper: any, startX: any, startY: any, element: any) {
		var color = this._bpmnGetColor(element, "#000000");
		var path1 = paper.path("M8,11 L8,21 L24,21 L24,11 L16,17z");
		path1.attr({
			"stroke": "white",
			"fill": color
		});

		var path2 = paper.path("M7,10 L16,17 L25 10z6");
		path2.attr({
			"stroke": "white",
			"fill": color
		});

		var sendTaskIcon = paper.set();
		sendTaskIcon.push(path1, path2);

		sendTaskIcon.transform("T" + startX + "," + startY);
	}

	_drawManualTaskIcon(paper: any, startX: any, startY: any, element: any) {
		var color = this._bpmnGetColor(element, "#000000");
		var path1 = paper.path("m 17,9.3290326 c -0.0069,0.5512461 -0.455166,1.0455894 -0.940778,1.0376604 l -5.792746,0 c 0.0053,0.119381 0.0026,0.237107 0.0061,0.355965 l 5.154918,0 c 0.482032,-0.0096 0.925529,0.49051 0.919525,1.037574 -0.0078,0.537128 -0.446283,1.017531 -0.919521,1.007683 l -5.245273,0 c -0.01507,0.104484 -0.03389,0.204081 -0.05316,0.301591 l 2.630175,0 c 0.454137,-0.0096 0.872112,0.461754 0.866386,0.977186 C 13.619526,14.554106 13.206293,15.009498 12.75924,15 L 3.7753054,15 C 3.6045812,15 3.433552,14.94423 3.2916363,14.837136 c -0.00174,0 -0.00436,0 -0.00609,0 C 1.7212035,14.367801 0.99998255,11.458641 1,11.458641 L 1,7.4588393 c 0,0 0.6623144,-1.316333 1.8390583,-2.0872584 1.1767614,-0.7711868 6.8053358,-2.40497 7.2587847,-2.8052901 0.453484,-0.40032 1.660213,1.4859942 0.04775,2.4010487 C 8.5332315,5.882394 8.507351,5.7996113 8.4370292,5.7936859 l 6.3569748,-0.00871 c 0.497046,-0.00958 0.952273,0.5097676 0.94612,1.0738232 -0.0053,0.556126 -0.456176,1.0566566 -0.94612,1.0496854 l -4.72435,0 c 0.01307,0.1149374 0.0244,0.2281319 0.03721,0.3498661 l 5.952195,0 c 0.494517,-0.00871 0.947906,0.5066305 0.940795,1.0679848 z");
		path1.attr({
			"opacity": 1,
			"stroke": "none",
			"fill": color
		});

		var manualTaskIcon = paper.set();
		manualTaskIcon.push(path1);

		manualTaskIcon.transform("T" + startX + "," + startY);
	}

	_drawReceiveTaskIcon(paper: any, startX: any, startY: any, element: any) {
		var color = this._bpmnGetColor(element, "#000000");
		var path = paper.path("m 0.5,2.5 0,13 17,0 0,-13 z M 2,4 6.5,8.5 2,13 z M 4,4 14,4 9,9 z m 12,0 0,9 -4.5,-4.5 z M 7.5,9.5 9,11 10.5,9.5 15,14 3,14 z");
		path.attr({
			"opacity": 1,
			"stroke": "none",
			"fill": color
		});

		startX += 4;
		startY += 2;

		path.transform("T" + startX + "," + startY);

	}

	_drawCamelTaskIcon(paper: any, startX: any, startY: any) {
		var path = paper.path("m 8.1878027,15.383782 c -0.824818,-0.3427 0.375093,-1.1925 0.404055,-1.7743 0.230509,-0.8159 -0.217173,-1.5329 -0.550642,-2.2283 -0.106244,-0.5273 -0.03299,-1.8886005 -0.747194,-1.7818005 -0.712355,0.3776 -0.9225,1.2309005 -1.253911,1.9055005 -0.175574,1.0874 -0.630353,2.114 -0.775834,3.2123 -0.244009,0.4224 -1.741203,0.3888 -1.554386,-0.1397 0.651324,-0.3302 1.13227,-0.9222 1.180246,-1.6705 0.0082,-0.7042 -0.133578,-1.3681 0.302178,-2.0083 0.08617,-0.3202 0.356348,-1.0224005 -0.218996,-0.8051 -0.694517,0.2372 -1.651062,0.6128 -2.057645,-0.2959005 -0.696769,0.3057005 -1.102947,-0.611 -1.393127,-1.0565 -0.231079,-0.6218 -0.437041,-1.3041 -0.202103,-1.9476 -0.185217,-0.7514 -0.39751099,-1.5209 -0.35214999,-2.301 -0.243425,-0.7796 0.86000899,-1.2456 0.08581,-1.8855 -0.76078999,0.1964 -1.41630099,-0.7569 -0.79351899,-1.2877 0.58743,-0.52829998 1.49031699,-0.242 2.09856399,-0.77049998 0.816875,-0.3212 1.256619,0.65019998 1.923119,0.71939998 0.01194,0.7333 -0.0031,1.5042 -0.18417,2.2232 -0.194069,0.564 -0.811196,1.6968 0.06669,1.9398 0.738382,-0.173 1.095723,-0.9364 1.659041,-1.3729 0.727298,-0.3962 1.093982,-1.117 1.344137,-1.8675 0.400558,-0.8287 1.697676,-0.6854 1.955367,0.1758 0.103564,0.5511 0.9073983,1.7538 1.2472763,0.6846 0.121868,-0.6687 0.785541,-1.4454 1.518183,-1.0431 0.813587,0.4875 0.658233,1.6033 1.285504,2.2454 0.768715,0.8117 1.745394,1.4801 2.196633,2.5469 0.313781,0.8074 0.568552,1.707 0.496624,2.5733 -0.35485,0.8576005 -1.224508,-0.216 -0.64725,-0.7284 0.01868,-0.3794 -0.01834,-1.3264 -0.370249,-1.3272 -0.123187,0.7586 -0.152778,1.547 -0.10869,2.3154 0.270285,0.6662005 1.310741,0.7653005 1.060553,1.6763005 -0.03493,0.9801 0.294343,1.9505 0.148048,2.9272 -0.320479,0.2406 -0.79575,0.097 -1.185062,0.1512 -0.165725,0.3657 -0.40138,0.921 -1.020848,0.6744 -0.564671,0.1141 -1.246404,-0.266 -0.578559,-0.7715 0.679736,-0.5602 0.898618,-1.5362 0.687058,-2.3673 -0.529674,-1.108 -1.275984,-2.0954005 -1.839206,-3.1831005 -0.634619,-0.1004 -1.251945,0.6779 -1.956789,0.7408 -0.6065893,-0.038 -1.0354363,-0.06 -0.8495673,0.6969005 0.01681,0.711 0.152396,1.3997 0.157345,2.1104 0.07947,0.7464 0.171287,1.4944 0.238271,2.2351 0.237411,1.0076 -0.687542,1.1488 -1.414811,0.8598 z m 6.8675483,-1.8379 c 0.114364,-0.3658 0.206751,-1.2704 -0.114466,-1.3553 -0.152626,0.5835 -0.225018,1.1888 -0.227537,1.7919 0.147087,-0.1166 0.265559,-0.2643 0.342003,-0.4366 z");
		path.attr({
			"opacity": 1,
			"stroke": "none",
			"fill": "#000000"
		});

		startX += 4;
		startY += 2;

		path.transform("T" + startX + "," + startY);

	}

	_drawHttpTaskIcon(paper: any, startX: any, startY: any) {
		var path = paper.path("m 16.704699,5.9229055 q 0.358098,0 0.608767,0.2506681 0.250669,0.250668 0.250669,0.6087677 0,0.3580997 -0.250669,0.6087677 -0.250669,0.2506679 -0.608767,0.2506679 -0.358098,0 -0.608767,-0.2506679 -0.250669,-0.250668 -0.250669,-0.6087677 0,-0.3580997 0.250669,-0.6087677 0.250669,-0.2506681 0.608767,-0.2506681 z m 2.578308,-2.0053502 q -2.229162,0 -3.854034,0.6759125 -1.624871,0.6759067 -3.227361,2.2694472 -0.716197,0.725146 -1.575633,1.7457293 L 7.2329969,8.7876913 Q 7.0897576,8.8055849 7.000233,8.9309334 L 4.9948821,12.368677 q -0.035811,0.06267 -0.035811,0.143242 0,0.107426 0.080572,0.205905 l 0.5729577,0.572957 q 0.125334,0.116384 0.2864786,0.07162 l 2.4708789,-0.760963 2.5156417,2.515645 -0.76096,2.470876 q -0.009,0.02687 -0.009,0.08057 0,0.125338 0.08058,0.205905 l 0.572957,0.572958 q 0.170096,0.152194 0.349146,0.04476 l 3.437744,-2.005351 q 0.125335,-0.08953 0.143239,-0.232763 l 0.17905,-3.392986 q 1.02058,-0.859435 1.745729,-1.575629 1.67411,-1.6830612 2.309735,-3.2049805 0.635625,-1.5219191 0.635625,-3.8585111 0,-0.1253369 -0.08505,-0.2148575 -0.08505,-0.089526 -0.201431,-0.089526 z");
		path.attr({
			"opacity": 1,
			"stroke": "none",
			"fill": "#000000"
		});

		startX += -2;
		startY += -2;

		path.transform("T" + startX + "," + startY);

	}

	_drawShellTaskIcon(paper: any, startX: any, startY: any) {
		var path = paper.path("m 1,2 0,14 16,0 0,-14 z m 1.4,3 12.7,0 0,10 -12.7,0 z");
		path.attr({
			"opacity": 1,
			"stroke": "none",
			"fill": "#000000"
		});
		var text = paper.text(3, 9, ">_").attr({
			"font-size": "5px",
			"fill": "#000000"
		});

		startY += -2;
		text.transform("T" + startX + "," + startY);
		startX += -2;
		path.transform("T" + startX + "," + startY);
	}

	_drawDecisionTaskIcon(paper: any, startX: any, startY: any) {
		var path = paper.path("m 1,2 0,14 16,0 0,-14 z m 1.9,2.4000386 3.7,0 0,2.7999224 -3.7,0 z m 4.36364,0 3.7,0 0,2.7999224 -3.7,0 z m 4.36364,0 3.7,0 0,2.7999224 -3.7,0 z m -8.67364,3.9 3.7,0 0,2.7999224 -3.7,0 z m 4.36364,0 3.7,0 0,2.7999224 -3.7,0 z m 4.36364,0 3.7,0 0,2.7999224 -3.7,0 z m -8.67364,3.9 3.7,0 0,2.7999224 -3.7,0 z m 4.36364,0 3.7,0 0,2.7999224 -3.7,0 z m 4.36364,0 3.7,0 0,2.7999224 -3.7,0 z");
		path.attr({
			"opacity": 1,
			"stroke": "none",
			"fill": "#000000"
		});

		startX += -2;
		startY += -2;

		path.transform("T" + startX + "," + startY);

	}

	_drawMuleTaskIcon(paper: any, startX: any, startY: any) {
		var path = paper.path("M 8,0 C 3.581722,0 0,3.5817 0,8 c 0,4.4183 3.581722,8 8,8 4.418278,0 8,-3.5817 8,-8 L 16,7.6562 C 15.813571,3.3775 12.282847,0 8,0 z M 5.1875,2.7812 8,7.3437 10.8125,2.7812 c 1.323522,0.4299 2.329453,1.5645 2.8125,2.8438 1.136151,2.8609 -0.380702,6.4569 -3.25,7.5937 -0.217837,-0.6102 -0.438416,-1.2022 -0.65625,-1.8125 0.701032,-0.2274 1.313373,-0.6949 1.71875,-1.3125 0.73624,-1.2317 0.939877,-2.6305 -0.03125,-4.3125 l -2.75,4.0625 -0.65625,0 -0.65625,0 -2.75,-4 C 3.5268433,7.6916 3.82626,8.862 4.5625,10.0937 4.967877,10.7113 5.580218,11.1788 6.28125,11.4062 6.063416,12.0165 5.842837,12.6085 5.625,13.2187 2.755702,12.0819 1.238849,8.4858 2.375,5.625 2.858047,4.3457 3.863978,3.2112 5.1875,2.7812 z");
		path.attr({
			"opacity": 1,
			"stroke": "none",
			"fill": "#000000"
		});

		startX += 4;
		startY += 2;

		path.transform("T" + startX + "," + startY);

	}

	_drawEventIcon(paper: any, element: any) {
		if (element.eventDefinition && element.eventDefinition.type) {
			if ("timer" === element.eventDefinition.type) {
				this._drawTimerIcon(paper, element);
			}
			else if ("conditional" === element.eventDefinition.type) {
				this._drawConditionalIcon(paper, element);
			}
			else if ("error" === element.eventDefinition.type) {
				this._drawErrorIcon(paper, element);
			}
			else if ("escalation" === element.eventDefinition.type) {
				this._drawEscalationIcon(paper, element);
			}
			else if ("signal" === element.eventDefinition.type) {
				this._drawSignalIcon(paper, element);
			}
			else if ("message" === element.eventDefinition.type) {
				this._drawMessageIcon(paper, element);
			}
			else if ("variable" === element.eventDefinition.type) {
				this._drawVariableListenerIcon(paper, element);
			}
		}
	}

	_drawConditionalIcon(paper: any, element: any) {
		var fill = "none";

		var path = paper.path("M 10 10 L 22 10 M 10 14 L 22 14 M 10 18 L 22 18 M 10 22 L 22 22");
		path.attr({
			"stroke": "black",
			"stroke-width": 1,
			"fill": fill
		});
		path.transform("T" + (element.x - 1) + "," + (element.y - 1));
		return path;
	}

	_drawVariableListenerIcon(paper: any, element: any) {
		var fill = "none";

		var path = paper.path("M 20.834856,22.874369 L 10.762008,22.873529 L 7.650126,13.293421 L 15.799725,7.3734296 L 23.948336,13.294781 L 20.834856,22.874369 z");
		path.attr({
			"stroke": "black",
			"stroke-width": 1,
			"fill": fill
		});
		path.transform("T" + (element.x - 1) + "," + (element.y - 1));
		return path;
	}

	_drawTimerIcon(paper: any, element: any) {
		var x = element.x + (element.width / 2);
		var y = element.y + (element.height / 2);

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		var circle = paper.circle(x, y, 10);

		circle.attr({
			"stroke-width": 1,
			"stroke": strokeColor,
			"fill": "none"
		});

		var path = paper.path("M 16 6 L 16 9 M 21 7 L 19.5 10 M 25 11 L 22 12.5 M 26 16 L 23 16 " +
			"M 25 21 L 22 19.5 M 21 25 L 19.5 22 M 16 26 L 16 23 M 11 25 L 12.5 22 M 7 21 L 10 19.5 " +
			"M 6 16 L 9 16 M 7 11 L 10 12.5 M 11 7 L 12.5 10 M 18 9 L 16 16 L 20 16");
		path.attr({
			"stroke": strokeColor,
			"stroke-width": 1,
			"fill": "none"
		});
		path.transform("T" + (element.x - 1) + "," + (element.y - 1));
		return path;
	}

	_drawErrorIcon(paper: any, element: any) {
		var path = paper.path("M 22.820839,11.171502 L 19.36734,24.58992 L 13.54138,14.281819 L 9.3386512,20.071607 L 13.048949,6.8323057 L 18.996148,16.132659 L 22.820839,11.171502 z");

		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		var fill = "none";
		var x = element.x - 1;
		var y = element.y - 1;
		if (element.type === "EndEvent") {
			fill = strokeColor;
			x -= 1;
			y -= 1;
		}


		path.attr({
			"stroke": strokeColor,
			"stroke-width": 1,
			"fill": fill
		});

		path.transform("T" + x + "," + y);
		return path;
	}

	_drawEscalationIcon(paper: any, element: any) {
		var fill = "none";
		if (element.type === "ThrowEvent") {
			fill = "black";
		}

		var path = paper.path("M 16,8.75 L22,23.75 L16,17 L10,23.75z");
		path.attr({
			"stroke": "black",
			"stroke-width": 1,
			"fill": fill
		});
		path.transform("T" + (element.x - 1) + "," + (element.y - 1));
		return path;
	}

	_drawSignalIcon(paper: any, element: any) {
		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		var fill = "none";
		if (element.type === "ThrowEvent") {
			fill = strokeColor;
		}

		var path = paper.path("M 8.7124971,21.247342 L 23.333334,21.247342 L 16.022915,8.5759512 L 8.7124971,21.247342 z");
		path.attr({
			"stroke": strokeColor,
			"stroke-width": 1,
			"fill": fill
		});
		path.transform("T" + (element.x - 1) + "," + (element.y - 1));
		return path;
	}

	_drawMessageIcon(paper: any, element: any) {
		var strokeColor = this._bpmnGetColor(element, this.setting.MAIN_STROKE_COLOR);

		var path = paper.path("M8,11 L8,21 L24,21 L24,11z M8,11 L16,17 L24,11");
		path.attr({
			"stroke": strokeColor,
			"stroke-width": 1,
			"fill": "none"
		});
		path.transform("T" + (element.x - 1) + "," + (element.y - 1));
		return path;
	}

	/**
	 * displayModel.html
	 * 
	 */

	_showTip(htmlNode: any, element: any) {
		// TODO: ENABLE QTIP


		var documentation = "";
		if (element.name && element.name.length > 0) {
			documentation += "<b>Name</b>: <i>" + element.name + "</i><br/><br/>";
		}

		var text;
		if (element.name && element.name.length > 0) {
			text = element.name;
		} else {
			text = element.id;
		}

		if (this.ignoreTip) {
			htmlNode.attr({
				'class': "hint--bottom",
				'aria-label': documentation
			}
			);
			// htmlNode.attr('aria-label', documentation);
			return;
		}

		htmlNode.qtip({
			content: {
				text: documentation,
				title: {
					text: text
				}
			},
			position: {
				my: 'top left',
				at: 'bottom center',
				viewport: $(window)
			},
			hide: {
				fixed: true, delay: 100,
				event: 'click mouseleave'
			},
			style: {
				classes: 'ui-tooltip-kisbpm-bpmn'
			}
		});
	}

	_expandCollapsedElement(element: any) {
		if (this.bpmnData.collapsed) {
			for (var i = 0; i < this.bpmnData.collapsed.length; i++) {
				var collapsedItem = this.bpmnData.collapsed[i];
				if (element.id == collapsedItem.id) {
					this.paper.clear();

					var modelElements = collapsedItem.elements;
					for (var i = 0; i < modelElements.length; i++) {
						var subElement = modelElements[i];
						var drawFunction = eval("this._draw" + subElement.type);
						drawFunction(subElement);
					}

					if (collapsedItem.flows) {
						for (var i = 0; i < collapsedItem.flows.length; i++) {
							var subFlow = collapsedItem.flows[i];
							this._drawFlow(subFlow);
						}
					}

					var collapsedName;
					if (element.name) {
						collapsedName = element.name;
					} else {
						collapsedName = 'sub process ' + element.id;
					}

					this.collapsedItemNavigation.push({
						"id": element.id,
						"name": collapsedName
					});

					this._buildNavigationTree();

					break;
				}
			}
		}
	}

	_navigateTo(elementId: any) {
		var modelElements = undefined;
		var modelFlows = undefined;
		let newCollapsedItemNavigation = new Array();

		if (elementId == 'FLOWABLE_ROOT_PROCESS') {
			modelElements = this.bpmnData.elements;
			modelFlows = this.bpmnData.flows;

		} else {

			for (var i = 0; i < this.bpmnData.collapsed.length; i++) {
				var collapsedItem = this.bpmnData.collapsed[i];

				var collapsedName = undefined;
				for (var j = 0; j < this.collapsedItemNavigation.length; j++) {
					if (elementId == this.collapsedItemNavigation[j].id) {
						collapsedName = this.collapsedItemNavigation[j].name;
						break;
					}
				}

				if (!collapsedName) {
					continue;
				}

				newCollapsedItemNavigation.push({
					"id": collapsedItem.id,
					"name": collapsedName
				});

				if (elementId == collapsedItem.id) {
					modelElements = collapsedItem.elements;
					modelFlows = collapsedItem.flows;
					break;
				}
			}
		}

		if (modelElements) {
			this.paper.clear();

			for (var i = 0; i < modelElements.length; i++) {
				var subElement = modelElements[i];
				var drawFunction = eval("this._draw" + subElement.type);
				drawFunction(subElement);
			}

			if (modelFlows) {
				for (var i = 0; i < modelFlows.length; i++) {
					var subFlow = modelFlows[i];
					this._drawFlow(subFlow);
				}
			}

			this.collapsedItemNavigation = newCollapsedItemNavigation;

			this._buildNavigationTree();
		}
	}

	_buildNavigationTree() {
		var navigationUrl = '| <a href="javascript:_navigateTo(\'FLOWABLE_ROOT_PROCESS\')">Root</a>';

		for (var i = 0; i < this.collapsedItemNavigation.length; i++) {
			navigationUrl += ' > <a href="javascript:_navigateTo(\'' + this.collapsedItemNavigation[i].id + '\')">' +
				this.collapsedItemNavigation[i].name + '</a>';
		}

		$('#navigationTree').html(navigationUrl);
	}

	_addHoverLogic(element: any, type: any, defaultColor: any, isMigrationModelElement: any, currentPaper: any) {
		var strokeColor = this._bpmnGetColor(element, defaultColor);
		let topBodyRect: any = null;
		if (type === "rect") {
			topBodyRect = currentPaper.rect(element.x, element.y, element.width, element.height);

		} else if (type === "circle") {
			var x = element.x + (element.width / 2);
			var y = element.y + (element.height / 2);
			topBodyRect = currentPaper.circle(x, y, 15);

		} else if (type === "rhombus") {
			topBodyRect = currentPaper.path("M" + element.x + " " + (element.y + (element.height / 2)) +
				"L" + (element.x + (element.width / 2)) + " " + (element.y + element.height) +
				"L" + (element.x + element.width) + " " + (element.y + (element.height / 2)) +
				"L" + (element.x + (element.width / 2)) + " " + element.y + "z"
			);
		}

		if (isMigrationModelElement) {

			topBodyRect.attr({
				"opacity": 0,
				"stroke": "none",
				"fill": "#ffffff"
			});

			topBodyRect.click(() => {
				var endElementIndex = $.inArray(element.id, this.changeStateEndElementIds);
				if (endElementIndex >= 0) {

					var glowElement = this.changeStateEndGlowElements[endElementIndex];
					glowElement.remove();

					this.changeStateEndGlowElements.splice(endElementIndex, 1);
					this.changeStateEndElementIds.splice(endElementIndex, 1);
					this.changeStateEndElements.splice(endElementIndex, 1);

				} else {
					var endGlowElement = topBodyRect.glow({ 'color': 'red' });
					this.changeStateEndGlowElements.push(endGlowElement);
					this.changeStateEndElementIds.push(element.id);
					this.changeStateEndElements.push(element);
				}

				if (this.changeStateStartElements.length > 0 && this.changeStateEndElements.length > 0) {
					$('#addMappingButton').show();

				} else {
					$('#addMappingButton').hide();
				}
			});

		} else {
			var opacity = 0;
			var fillColor = "#ffffff";
			if ($.inArray(element.id, this.elementsAdded) >= 0) {
				opacity = 0.2;
				fillColor = "green";
			}

			if ($.inArray(element.id, this.elementsRemoved) >= 0) {
				opacity = 0.2;
				fillColor = "red";
			}

			topBodyRect.attr({
				"opacity": opacity,
				"stroke": "none",
				"fill": fillColor
			});
			this._showTip($(topBodyRect.node), element);

			topBodyRect.click(() => {

				var startElementIndex = $.inArray(element.id, this.changeStateStartElementIds);
				var endElementIndex = $.inArray(element.id, this.changeStateEndElementIds);
				if (startElementIndex >= 0) {

					var glowElement = this.changeStateStartGlowElements[startElementIndex];
					glowElement.remove();

					this.changeStateStartGlowElements.splice(startElementIndex, 1);
					this.changeStateStartElementIds.splice(startElementIndex, 1);
					this.changeStateStartElements.splice(startElementIndex, 1);

				} else if (endElementIndex >= 0) {

					var glowElement = this.changeStateEndGlowElements[endElementIndex];
					glowElement.remove();

					this.changeStateEndGlowElements.splice(endElementIndex, 1);
					this.changeStateEndElementIds.splice(endElementIndex, 1);
					this.changeStateEndElements.splice(endElementIndex, 1);

				} else {
					if (element.current) {
						var startGlowElement = topBodyRect.glow({ 'color': 'blue' });
						this.changeStateStartGlowElements.push(startGlowElement);
						this.changeStateStartElementIds.push(element.id);
						this.changeStateStartElements.push(element);

					} else {
						var endGlowElement = topBodyRect.glow({ 'color': 'red' });
						this.changeStateEndGlowElements.push(endGlowElement);
						this.changeStateEndElementIds.push(element.id);
						this.changeStateEndElements.push(element);
					}
				}

				if (this.changeStateStartElements.length > 0 && this.changeStateEndElements.length > 0) {
					$('#changeStateButton').show();
				} else {
					$('#changeStateButton').hide();
				}
			});
		}

		topBodyRect.mouseover(() => {
			currentPaper.getById(element.id).attr({ "stroke": this.setting.HOVER_COLOR });
		});

		topBodyRect.mouseout(() => {
			currentPaper.getById(element.id).attr({ "stroke": strokeColor });
		});
	}

	_zoom(zoomIn: any) {
		var tmpCanvasWidth, tmpCanvasHeight;
		if (zoomIn) {
			tmpCanvasWidth = this.canvasWidth * (1.0 / 0.90);
			tmpCanvasHeight = this.canvasHeight * (1.0 / 0.90);
		} else {
			tmpCanvasWidth = this.canvasWidth * (1.0 / 1.10);
			tmpCanvasHeight = this.canvasHeight * (1.0 / 1.10);
		}

		if (tmpCanvasWidth != this.canvasWidth || tmpCanvasHeight != this.canvasHeight) {
			this.canvasWidth = tmpCanvasWidth;
			this.canvasHeight = tmpCanvasHeight;
			this.paper.setSize(this.canvasWidth, this.canvasHeight);
		}
	}

	static _showProcessDiagram(document: any, data: any) {
		if (!data.elements || data.elements.length == 0) return;
		let INITIAL_CANVAS_WIDTH = data.diagramWidth + 20;
		let INITIAL_CANVAS_HEIGHT = data.diagramHeight + 50;
		let canvasWidth = INITIAL_CANVAS_WIDTH;
		let canvasHeight = INITIAL_CANVAS_HEIGHT;
		let viewBoxWidth = INITIAL_CANVAS_WIDTH;
		let viewBoxHeight = INITIAL_CANVAS_HEIGHT;

		var x = 0;
		// if ($(window).width() > canvasWidth) {
		// 	x = ($(window).width() - canvasWidth) / 2 - (data.diagramBeginX / 2);
		// }

		var canvasValue = 'bpmnModel';

		$('#' + canvasValue).width(INITIAL_CANVAS_WIDTH);
		$('#' + canvasValue).height(INITIAL_CANVAS_HEIGHT);
		let paper = Raphael(document.getElementById(canvasValue), canvasWidth, canvasHeight);
		paper.setViewBox(0, 0, viewBoxWidth, viewBoxHeight, false);
		paper.renderfix();

		let settings = {
			INITIAL_CANVAS_WIDTH: canvasWidth,
			INITIAL_CANVAS_HEIGHT: canvasHeight,
			NORMAL_STROKE: 2,
			SEQUENCEFLOW_STROKE: 2,
			ASSOCIATION_STROKE: 2,
			TASK_STROKE: 2,
			CALL_ACTIVITY_STROKE: 4,
			ENDEVENT_STROKE: 4,
			CURRENT_ACTIVITY_STROKE: 4,

			COMPLETED_COLOR: "#2674aa",
			TEXT_COLOR: "#373e48",
			CURRENT_COLOR: "#66AA66",
			HOVER_COLOR: "#d5bc01",
			ACTIVITY_STROKE_COLOR: "#000000",
			ACTIVITY_FILL_COLOR: "#ffffff",
			MAIN_STROKE_COLOR: "#585858",

			TEXT_PADDING: 3,
			ARROW_WIDTH: 6,
			MARKER_WIDTH: 12,

			TASK_FONT: { font: "11px Arial", opacity: 1, fill: Raphael.rgb(0, 0, 0) },
			// icons
			ICON_SIZE: 16,
			ICON_PADDING: 4
		};

		let bpmn = new BpmnDraw(paper, data, settings);
		if (data.pools) {
			for (var i = 0; i < data.pools.length; i++) {
				var pool = data.pools[i];
				bpmn._drawPool(pool, false, paper);
			}
		}

		var modelElements = data.elements;
		for (var i = 0; i < modelElements.length; i++) {
			var element = modelElements[i];
			try {
				console.log(element.type);
				switch (element.type) {
					case 'StartEvent':
						bpmn._drawStartEvent(element, false, paper);
						break
					case 'UserTask':
						bpmn._drawUserTask(element, false, paper);
						break
					case 'EndEvent':
						bpmn._drawEndEvent(element, false, paper);
						break
					case 'EndEvent':
						bpmn._drawEndEvent(element, false, paper);
						break
					default:
						alert("Type not supported " + element.type);
				}
			} catch (err) {
				console.warn(err);
			}
		}

		if (data.flows) {
			for (var i = 0; i < data.flows.length; i++) {
				var flow = data.flows[i];
				if (flow.type === 'sequenceFlow') {
					bpmn._drawFlow(flow, paper);
				} else if (flow.type === 'association') {
					bpmn._drawAssociation(flow, paper);
				}
			}
		}


	}

}

