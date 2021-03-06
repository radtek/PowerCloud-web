import {initMqttConnection, mqttSubscribe, mqttDisconnect} from './api.js';
var chart = require('./chart.js')

var g_clientSys;
var MQTT_TOPIC_SYS = "/systemStatus"

var staffImgUrl = require('../assets/staff-pic.png');

function popStaffDetail(detail) {

	var popJQ = $("#pop-staff");
	var html = `<div class="pic"><img src="${detail.pic||staffImgUrl }"></div>
			        <div class="info">
			        	<p class="name">员工编号：${detail.id||"-"}</p>
			          <p class="name">员工姓名：${detail.name||""}</p>
			          <p class="name">所属公司：${detail.sccompanyname||"-"}</p>
			          <p class="name">当前职称：${detail.positionaltitle||"-"}</p>
			          <p class="name">办公电话：${detail.tel||"-"}</p>
			          <p class="name">移动电话：${detail.phone||"-"}</p>
			          <p class="status">在岗状态：<i class="fa ${detail.status == 0 ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i></p>
			        </div>`
	popJQ.find(".content").html(html);
	// popJQ[0].style.left = "55%";
	// popJQ[0].style.top = "25%";
	popJQ.show();
	setTimeout(function() {
		popJQ.addClass('show');
	},100)
}


function popCompanyDetail(detail) {
	maskShow();
	var popJQ = $("#pop-company-staff");
	var iJQ = $("#pop-company-i");
	var loadJQ = $("#pop-company-load");
	//员工列表
	popJQ.find(".staff-num").html("");
	var staffList = detail.staffList;
	var html_arr = [];
	staffList.forEach(function(o, i) {
		html_arr.push(`<li>
				            <span class="name">${o.name}</span>
				            <span class="duty">${o.duty}</span>
				            <span class="status">在岗状态：<i class="fa ${o.status == 0 ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i></span>
				          </li>`)
	})
	popJQ.find("ul").html(html_arr.join(""));

	popJQ.show();
	iJQ.show();
	loadJQ.show();
	setTimeout(function() {
		popJQ.addClass('show');
		setTimeout(function() {
			iJQ.addClass('show');
			setTimeout(function() {
  			loadJQ.addClass('show');
			},100)
		},100)
	},100);

	chart.renderCompanyChart(detail);
}

function popStationDetail(detail) {
	var staionId = detail.id;
	maskShow();
	//系统图
	var popJQ = $("#pop-station-sys");
	var sysJQ = $("#station-sys");
	var iJQ = $("#pop-station-i");
	var loadJQ = $("#pop-station-load");

	sysJQ.html(detail.sys);
	var svgJQ = $("#station-sys svg");
	if(svgJQ.length){
		svgJQ[0].style.transform = "rotate(0)";
	}

	clearClient();
	initMqttConnection(function(client) {
    g_clientSys = client;
    var topic = MQTT_TOPIC_SYS+"/"+staionId;
    mqttSubscribe(g_clientSys, topic);
  }, onMessageArrived);

  //这里收到该企业下，所有变电站发来的消息
  function onMessageArrived(msg) {
    //判断是哪个变电站 TODO
    console.log("==== handle Mqtt system graph status ====");
    try {
    	var topic = msg.destinationName;
    	console.log(msg.payloadString);
    	var data = JSON.parse(msg.payloadString);
      setSysData(data, detail.name + " - " + "电力系统图");
    } catch(e){console.error("Error: error in onMessageArrived", e)}
  }

	popJQ.show();
	iJQ.show();
	loadJQ.show();
	setTimeout(function() {
		popJQ.addClass('show');
		setTimeout(function() {
			iJQ.addClass('show');
			setTimeout(function() {
  			loadJQ.addClass('show');
			},100)
		},100)
	},100);

	//电流图
  //载荷图
  chart.renderStationChart(detail);
}

function setSysData(data,title) {
	if(title) {
		document.querySelector(".s-t-title tspan").innerHTML = title;
	}

	var groupEle = document.querySelectorAll(".s-group");
	var vmEle = document.querySelectorAll(".s-t-vm tspan");
	var cabinetEle = document.querySelectorAll(".s-t-cabinet");
	var circuitEle = document.querySelectorAll(".s-t-circuit");
	//所有电表
	var rectEle = document.querySelectorAll(".s-rect");

	data.forEach( (item,i) => {
		var info1 = "";
		for( var o in item.vm) {
			info1 +=  `${o}: ${+(item.vm)[o].toFixed(2)}  `;
		}
		vmEle[i].innerHTML = info1;

		//进线柜信息
		var cab_nodes = cabinetEle[i].childNodes;
		cab_nodes[0].innerHTML = "Uab: "+ (+item.cabinet.Uab).toFixed(2);
		cab_nodes[1].innerHTML = "Ubc: "+ (+item.cabinet.Ubc).toFixed(2);
		cab_nodes[2].innerHTML = "Uac: "+ (+item.cabinet.Uac).toFixed(2);
		cab_nodes[3].innerHTML = "Ia: "+ (+item.cabinet.Ia).toFixed(2);
		cab_nodes[4].innerHTML = "Ib: "+ (+item.cabinet.Ib).toFixed(2);
		cab_nodes[5].innerHTML = "Ic: "+ (+item.cabinet.Ic).toFixed(2);

		cab_nodes[6].innerHTML = "";
		// cab_nodes[6].innerHTML = "cosφ: "+ item.cabinet.cosφ;
		//进线柜 电表颜色
		setColor(document.querySelectorAll(".s-cab-rect")[i],item.cabinet.status);

		/*//电容柜 电表颜色
		item.capacity.forEach( (ca, ca_i) => {
			var caEle = groupEle[i].querySelectorAll(".s-cap-rect")[ca_i];
			setColor(caEle,item.cabinet.status);
		})*/

		//配电柜信息
		var distributing = item.distributing
		distributing.forEach( (d,d_i) => {
			d.forEach( (c,c_i) => {
				var _i = i*data.length*d.length + d_i*d.length + c_i;
					var circuit_nodes= circuitEle[_i].childNodes;
				circuit_nodes[0].innerHTML = "Ia: "+ (+c.Ia).toFixed(2);
				circuit_nodes[1].innerHTML = "Ib: "+ (+c.Ib).toFixed(2);
				circuit_nodes[2].innerHTML = "Ic: "+ (+c.Ic).toFixed(2);

				var cirEle = document.querySelectorAll(".s-rect")[_i];
				setColor(cirEle,c.status);

			})
		})
	})

	function setColor(ele,status) {
		ele.setAttribute("fill",status == 0 ? "#e53935" : "#4caf50");
	}
}




function maskShow(){
	$("#mask").addClass('show');
}

function clearPop() {
	$(".pop").removeClass('show');
	//关闭mqtt链接
	chart.clearClient();
	clearClient();
}

function clearClient() {
	if(g_clientSys) {
		mqttDisconnect(g_clientSys);
		g_clientSys = null;
	}
}


export {
	popStaffDetail,
	popCompanyDetail,
	popStationDetail,
	clearPop
};

