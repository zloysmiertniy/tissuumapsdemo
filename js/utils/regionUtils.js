/**
 * @namespace regionUtils
 * @classdesc Region utilities, everything to do with 
 * regions or their calculations goes here */
regionUtils = {
	/** if _isNewRegion is true then a new region will start */
	_isNewRegion: true,
	/** _currentlyDrawing:false, */
	_currentlyDrawing: false,
	/** _currentRegionId: keep then number of drawn regions and also let them be the id, */
	_currentRegionId: 0,
	/** _currentPoints: array of points for the current region, */
	_currentPoints: null,
	/** _colorInactiveHandle:"#cccccc", */
	_colorInactiveHandle: "#cccccc",
	/** _colorActiveHandle: Color of the point in the region, */
	_colorActiveHandle: "#ffff00",
	/** _scaleHandle: scale of the point in regions, */
	_scaleHandle: 0.0025,
	/** _polygonStrokeWidth: width of the stroke of the polygon, */
	_polygonStrokeWidth: 0.0006,
	/** _handleRadius:Radius of the point of the region, */
	_handleRadius: 0.1,
	/** _epsilonDistance: distance at which a click from the first point will consider to be closing the region, */
	_epsilonDistance: 0.004,
	/** _regions: object that contains the regions in the viewer, */
	_regions: {},
	/** _drawingclass:"drawPoly", */
	_drawingclass: "drawPoly"
}

/** 
 *  regionUtils */
regionUtils.resetManager = function () {
	var drawingclass = regionUtils._drawingclass;
	d3.select("." + drawingclass).remove();
	regionUtils._isNewRegion = true;
	regionUtils._currentPoints = null;
}
/** 
 *  regionUtils */
regionUtils.manager = function (event) {
	//console.log(event);
	var drawingclass = regionUtils._drawingclass;
	//console.log(event);
	//if we come here is because overlayUtils.drawRegions mode is on
	// No matter what we have to get the normal coordinates so
	//I am going to have to do a hack to get the right OSD viewer
	//I will go two parents up to get the DOM id which will tell me the name
	//and then I will look for it in tmapp... this is horrible, but will work

	/*var eventSource=event.eventSource;//this is a mouse tracker not a viewer
	var OSDsvg=d3.select(eventSource.element).select("svg").select("g");
	var stringOSDVname=eventSource.element.parentElement.parentElement.id;
	var overlay=stringOSDVname.substr(0,stringOSDVname.indexOf('_'));*/
	//console.log(overlay);
	var OSDviewer = tmapp[tmapp["object_prefix"] + "_viewer"];
	var normCoords = OSDviewer.viewport.pointFromPixel(event.position);
	//var canvas=tmapp[tmapp["object_prefix"]+"_svgov"].node();
	var canvas = overlayUtils._d3nodes[tmapp["object_prefix"] + "_regions_svgnode"].node();
	//console.log(normCoords);
	var regionobj;
	//console.log(d3.select(event.originalEvent.target).attr("is-handle"));
	var strokeWstr = regionUtils._polygonStrokeWidth.toString();

	if (regionUtils._isNewRegion) {
		//if this region is new then there should be no points, create a new array of points
		regionUtils._currentPoints = [];
		//it is not a new region anymore
		regionUtils._isNewRegion = false;
		//give a new id
		regionUtils._currentRegionId += 1;
		var idregion = regionUtils._currentRegionId;
		//this is out first point for this region
		var startPoint = [normCoords.x, normCoords.y];
		regionUtils._currentPoints.push(startPoint);
		//create a group to store region
		regionobj = d3.select(canvas).append('g').attr('class', drawingclass);
		regionobj.append('circle').attr('r', regionUtils._handleRadius).attr('fill', regionUtils._colorActiveHandle).attr('stroke', '#aaaaaa')
			.attr('stroke-width', strokeWstr).attr('class', 'region' + idregion).attr('id', 'handle-0-region' + idregion)
			.attr('transform', 'translate(' + (startPoint[0].toString()) + ',' + (startPoint[1].toString()) + ') scale(' + regionUtils._scaleHandle + ')')
			.attr('is-handle', 'true').style({ cursor: 'pointer' });

	} else {
		var idregion = regionUtils._currentRegionId;
		var nextpoint = [normCoords.x, normCoords.y];
		var count = regionUtils._currentPoints.length - 1;

		//check if the distance is smaller than epsilonDistance if so, CLOSE POLYGON

		if (regionUtils.distance(nextpoint, regionUtils._currentPoints[0]) < regionUtils._epsilonDistance && count >= 2) {
			regionUtils.closePolygon();
			return;
		}

		regionUtils._currentPoints.push(nextpoint);
		regionobj = d3.select("." + drawingclass);

		regionobj.append('circle')
			.attr('r', regionUtils._handleRadius).attr('fill', regionUtils._colorActiveHandle).attr('stroke', '#aaaaaa')
			.attr('stroke-width', strokeWstr).attr('class', 'region' + idregion).attr('id', 'handle-' + count.toString() + '-region' + idregion)
			.attr('transform', 'translate(' + (nextpoint[0].toString()) + ',' + (nextpoint[1].toString()) + ') scale(' + regionUtils._scaleHandle + ')')
			.attr('is-handle', 'true').style({ cursor: 'pointer' });

		regionobj.select('polyline').remove();
		var polyline = regionobj.append('polyline').attr('points', regionUtils._currentPoints)
			.style('fill', 'none')
			.attr('stroke-width', strokeWstr)
			.attr('stroke', '#aaaaaa').attr('class', "region" + idregion);


	}

}
/** 
 *  regionUtils */
regionUtils.closePolygon = function () {
	var canvas = overlayUtils._d3nodes[tmapp["object_prefix"] + "_regions_svgnode"].node();
	var drawingclass = regionUtils._drawingclass;
	var regionid = 'region' + regionUtils._currentRegionId.toString();
	d3.select("." + drawingclass).remove();
	regionsobj = d3.select(canvas);

	var hexcolor = overlayUtils.randomColor("hex");
	regionsobj.append('polygon').attr("points", regionUtils._currentPoints).attr("id", regionid + "poly")
		.attr("class", "regionpoly").attr("polycolor", hexcolor).style('stroke-width', regionUtils._polygonStrokeWidth.toString())
		.style("stroke", hexcolor).style("fill", "none");
	regionUtils._isNewRegion = true;
	regionUtils.addRegion(regionUtils._currentPoints, regionid, hexcolor);
	regionUtils._currentPoints = null;
}
/** 
 *  regionUtils */
regionUtils.createImportedRegion = function (region) {
	var canvas = overlayUtils._d3nodes[tmapp["object_prefix"] + "_regions_svgnode"].node();
	regionsobj = d3.select(canvas);

	regionUtils._regions[region.id] = region;
	var hexcolor = region.polycolor;

	var tempointarray = [];
	region.points.forEach(function (e) {
		tempointarray.push(e.x);
		tempointarray.push(e.y);
	});

	if(region.len==0){
		console.log(region.id+" has length 0, recalculating length");
		region.len=region.points.length;
	}

	regionsobj.append('polygon').attr("points", tempointarray).attr("id", region.id + "poly")
		.attr("class", "regionpoly").attr("polycolor", hexcolor).style('stroke-width', regionUtils._polygonStrokeWidth.toString())
		.style("stroke", hexcolor).style("fill", "none");
	regionUtils.regionUI(region.id);

}
/** 
 *  regionUtils */
regionUtils.distance = function (p1, p2) {
	return Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]))
}
/** 
 *  regionUtils */
regionUtils.addRegion = function (points, regionid, color) {
	var op = tmapp["object_prefix"];
	var imageWidth = OSDViewerUtils.getImageWidth();
	var region = { "id": regionid, "points": [], "globalPoints": [], "regionName": regionid, "regionClass": null, "barcodeHistogram": [] };
	region.len = points.length;
	var _xmin = points[0][0], _xmax = points[0][0], _ymin = points[0][1], _ymax = points[0][1];
	var objectPointsArray = [];
	for (var i = 0; i < region.len; i++) {
		if (points[i][0] > _xmax) _xmax = points[i][0];
		if (points[i][0] < _xmin) _xmin = points[i][0];
		if (points[i][1] > _ymax) _ymax = points[i][1];
		if (points[i][1] < _ymin) _ymin = points[i][1];
		region.points.push({ "x": points[i][0], "y": points[i][1] });
		region.globalPoints.push({ "x": points[i][0] * imageWidth, "y": points[i][1] * imageWidth });
	}
	region._xmin = _xmin, region._xmax = _xmax, region._ymin = _ymin, region._ymax = _ymax;
	region._gxmin = _xmin * imageWidth, region._gxmax = _xmax * imageWidth, region._gymin = _ymin * imageWidth, region._gymax = _ymax * imageWidth;
	region.polycolor = color;

	regionUtils._regions[regionid] = region;
	regionUtils._regions[regionid].associatedPoints=[];
	regionUtils.regionUI(regionid);
}
/** 
 *  regionUtils */
regionUtils.regionUI = function (regionid) {

	var op = tmapp["object_prefix"];
	var regionsPanel = document.getElementById("markers-regions-panel");

	var rPanel = HTMLElementUtils.createPanel({ id: op + regionid + "panel", headingInnerText: regionid });
	regionsPanel.appendChild(rPanel);

	var rpanelbody = HTMLElementUtils.getFirstChildByClass(rPanel, "panel-body");
	rpanelbody.setAttribute("style", "padding-top: 0px;");
	var rpanelheading = HTMLElementUtils.getFirstChildByClass(rPanel, "panel-heading");

	var form=HTMLElementUtils.createForm({extraAttributes: { class:"form-inline", onsubmit:"return false;"} });
	var formgroupcolor= HTMLElementUtils.createElement({type:"div",extraAttributes: {style:"max-width: 20%;", class:"form-group"} });
	var formgroupname= HTMLElementUtils.createElement({type:"div",extraAttributes: {style:"max-width: 30%;  padding:0px 3px 0px 3px;", class:"form-group"} });
	var formgroupclass= HTMLElementUtils.createElement({type:"div",extraAttributes: { style:"max-width: 30%;  padding:0px 3px 0px 3px;",class:"form-group"} });

	var regioncolorinput = HTMLElementUtils.inputTypeColor({ id: regionid + "color_input" });
	if (document.getElementById(regionid + "poly")) {
		var regionpoly = document.getElementById(regionid + "poly");
		regioncolorinput.setAttribute("value", regionpoly.getAttribute("polycolor"));
	} else if (regionUtils._regions[regionid].polycolor) {
		regioncolorinput.setAttribute("value", regionUtils._regions[regionid].polycolor);
	}
	formgroupcolor.appendChild(regioncolorinput);

	var regionnametext = HTMLElementUtils.inputTypeText({ id: regionid + "name_ta", extraAttributes: { size:9, placeholder: "name",class:" input-sm form-control " } });
	formgroupname.appendChild(regionnametext);

	var regionclasstext = HTMLElementUtils.inputTypeText({ id: regionid + "class_ta", extraAttributes: {size:9, placeholder: "class",class:" input-sm form-control " } });
	formgroupclass.appendChild(regionclasstext);
	
	form.appendChild(formgroupcolor);
	form.appendChild(formgroupname);
	form.appendChild(formgroupclass);

	//button to set new features of region
	var regionsetbutton = HTMLElementUtils.createButton({ id: regionid + "set_btn", innerText: "Set", extraAttributes: {style:"margin:0px 2px 0px 2px;", parentRegion: regionid,class:" btn btn-primary btn-sm form-control" } });
	regionsetbutton.addEventListener('click', function () { regionUtils.changeRegionUI($(this)); });

	//button to fill polygon
	var regionsfillbutton = HTMLElementUtils.createButton({ id: regionid + "fill_btn", innerText: "Fill", extraAttributes: {style:"margin:0px 2px 0px 2px;", parentRegion: regionid,class:" btn btn-primary btn-sm form-control" } });
	regionsfillbutton.addEventListener('click', function () { regionUtils.fillRegionUI($(this)); });

	var regionanalyzebutton = HTMLElementUtils.createButton({ id: regionid + "analyze_btn", innerText: "Analyze", extraAttributes: {style:"margin:0px 2px 0px 2px;", parentRegion: regionid, class:" btn btn-primary btn-sm form-control"} });
	regionanalyzebutton.addEventListener('click', function () { regionUtils.analyzeRegion($(this)); });
	
	form.appendChild(regionsetbutton);
	form.appendChild(regionanalyzebutton);
	form.appendChild(regionsfillbutton);
	
	rpanelbody.appendChild(form);

	var regionText = "";
	var rClass = null;
	var rName = null;

	if (regionUtils._regions[regionid].regionClass) {
		rClass = regionUtils._regions[regionid].regionClass;
		regionclasstext.value = rClass;
	}
	if (regionUtils._regions[regionid].regionName) {
		rName = regionUtils._regions[regionid].regionName;
		if (regionUtils._regions[regionid].regionName != regionid)
			regionnametext.value = rName;
	} else {
		rName = regionid;
	}
	regionText = rName;

	if (rClass) regionText = regionText + " (" + rClass + ")";

	//console.log(rName+rClass+regionText);

	rpanelheading.innerHTML = regionText;
}
/** 
 *  regionUtils */
regionUtils.searchTreeForPointsInRegion = function (quadtree, x0, y0, x3, y3, regionid, options) {
	
	if (options.globalCoords) {
		var pointInRegion = geometryUtils.globalPointInRegion;
		var xselector = "global_X_pos";
		var yselector = "global_Y_pos";
	} else {
		var pointInRegion = geometryUtils.viewerPointInRegion;
		var xselector = "viewer_X_pos";
		var yselector = "viewer_Y_pos";
	}

	var countsInsideRegion = 0;
	var pointsInside=[];
	quadtree.visit(function (node, x1, y1, x2, y2) {
		if (!node.length) {
			do {
				var d = node.data;
				d.scanned = true;
				var selected = (d[xselector] >= x0) && (d[xselector] < x3) && (d[yselector] >= y0) && (d[yselector] < y3);
				if (selected) {
					if (pointInRegion(d[xselector], d[yselector], regionUtils._regions[regionid])) {
						countsInsideRegion += 1;
						pointsInside.push(d);
						
					}
				}
			} while (node = node.next);
		}
		return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
	});
	
	if (countsInsideRegion) {
		regionUtils._regions[regionid].barcodeHistogram.push({ "barcode": quadtree.treeName, "gene_name": quadtree.treeGeneName, "count": countsInsideRegion });
	}
	return pointsInside;
}
/** 
 *  regionUtils */
regionUtils.changeRegionUI = function (callingbutton) {
	var regionid = callingbutton[0].getAttribute("parentRegion");
	regionUtils.changeRegion(regionid);

}

regionUtils.fillAllRegions=function(){
	for(var property in regionUtils._regions){
		if (regionUtils._regions.hasOwnProperty(property)) {
			regionUtils.fillRegion(property);
		}
	}
}

regionUtils.fillRegionUI = function (callingbutton) {
	var regionid = callingbutton[0].getAttribute("parentRegion");
	regionUtils.fillRegion(regionid);

}

regionUtils.fillRegion = function (regionid) {
	if(regionUtils._regions[regionid].filled === 'undefined'){
		regionUtils._regions[regionid].filled=true;
	}else{
		regionUtils._regions[regionid].filled=!regionUtils._regions[regionid].filled;
	}
	var newregioncolor = document.getElementById(regionid + "color_input").value;
	var d3color = d3.rgb(newregioncolor);
	var newStyle="";
	if(regionUtils._regions[regionid].filled){
		newStyle = "stroke-width: " + regionUtils._polygonStrokeWidth.toString()+ "; stroke: " + d3color.rgb().toString()+";";
		d3color.opacity=0.5;
		newStyle +="fill: "+d3color.rgb().toString()+";";
	}else{
		newStyle = "stroke-width: " + regionUtils._polygonStrokeWidth.toString() + "; stroke: " + d3color.rgb().toString() + "; fill: none;";
	}
	document.getElementById(regionid + "poly").setAttribute("style", newStyle);

}
/** 
 *  regionUtils */
regionUtils.changeRegion = function (regionid) {
	var op = tmapp["object_prefix"];
	var newregioncolor = document.getElementById(regionid + "color_input").value;
	var d3color = d3.rgb(newregioncolor);
	if (document.getElementById(regionid + "class_ta").value) {
		regionUtils._regions[regionid].regionClass = document.getElementById(regionid + "class_ta").value;
	} else {
		regionUtils._regions[regionid].regionClass = null;
	}
	if (document.getElementById(regionid + "name_ta").value) {
		regionUtils._regions[regionid].regionName = document.getElementById(regionid + "name_ta").value;
	} else {
		regionUtils._regions[regionid].regionName = regionid;
	}
	var rPanel = document.getElementById(op + regionid + "panel");
	var regionClass = "";
	if (regionUtils._regions[regionid].regionClass) regionClass = " (" + regionUtils._regions[regionid].regionClass + ")";
	HTMLElementUtils.getFirstChildByClass(rPanel, "panel-heading").innerHTML = regionUtils._regions[regionid].regionName + regionClass;

	var newStyle = "stroke-width: " + regionUtils._polygonStrokeWidth.toString() + "; stroke: " + d3color.rgb().toString() + "; fill: none;";
	regionUtils._regions[regionid].polycolor = newregioncolor;
	//console.log(newStyle);

	document.getElementById(regionid + "poly").setAttribute("style", newStyle);

}
/** 
 *  regionUtils */
regionUtils.loadTextRegionUI = function (regionid) {
	var op = tmapp["object_prefix"];
	var rPanel = document.getElementById(op + regionid + "panel");
	var regionText = "";
	var rClass = null;
	var rName = null;

	if (regionUtils._regions[regionid].regionClass) {
		rClass = regionUtils._regions[regionid].regionClass;
	}
	if (regionUtils._regions[regionid].regionName) {
		rName = regionUtils._regions[regionid].regionName;
	} else {
		rName = regionid;
	}
	regionText = rName;

	if (rClass) regionText = regionText + " (" + rClass + ")";

	console.log(rName + rClass + regionText);

	HTMLElementUtils.getFirstChildByClass(rPanel, "panel-heading").innerHTML = regionText;


}
/** 
 *  regionUtils */
regionUtils.analyzeRegion = function (callingbutton) {
	var op = tmapp["object_prefix"];

	if (!dataUtils[op + "_barcodeGarden"]) {
		alert("Load markers first");
		return;
	}

	function compare(a, b) {
		if (a.count > b.count)
			return -1;
		if (a.count < b.count)
			return 1;
		return 0;
	}

	function clone(obj) {
		if (null == obj || "object" != typeof obj) return obj;
		var copy = obj.constructor();
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
		}
		return copy;
	}

	var regionid = callingbutton[0].getAttribute("parentRegion");
	regionUtils._regions[regionid].associatedPoints=[];
	//var regiondomid=callingbutton[0].getAttribute("parentRegion")+"poly";
	console.log("analyzing "+regionid);
	var allkeys=Object.keys(dataUtils[op + "_barcodeGarden"]);
	for (var codeIndex in allkeys) {
		var code = allkeys[codeIndex];
		//console.log(code);
		var pointsInside=regionUtils.searchTreeForPointsInRegion(dataUtils[op + "_barcodeGarden"][code],
			regionUtils._regions[regionid]._gxmin,
			regionUtils._regions[regionid]._gymin,
			regionUtils._regions[regionid]._gxmax,
			regionUtils._regions[regionid]._gymax,
			regionid,
			{"globalCoords":true});
		if(pointsInside.length>0){
			//console.log(codeIndex,"has points",pointsInside);
			pointsInside.forEach(function(p){
				var pin=clone(p);
				pin.regionid=regionid;
				regionUtils._regions[regionid].associatedPoints.push(pin)
			});
		}
	}
	regionUtils._regions[regionid].barcodeHistogram.sort(compare);
	//alert("Region "+regionUtils._regions[regionid].regionName+" analyzed");

	var rPanel = document.getElementById(op + regionid + "panel");
	var rpanelbody = HTMLElementUtils.getFirstChildByClass(rPanel, "panel-body");
	rpanelbody.setAttribute("style", "padding-top: 0px; height: 230px;overflow-y:scroll;");

	var div = HTMLElementUtils.createElement({ type: "div", id: regionid + "histogram" });
	var histogram = regionUtils._regions[regionid].barcodeHistogram;
	var ul=div.appendChild(HTMLElementUtils.createElement({ type: "ul" }))
	for (var i in histogram) {
		var innerHTML = "<strong>" + histogram[i].gene_name + "," + histogram[i].barcode + ",</strong>" + histogram[i].count;
		ul.appendChild(HTMLElementUtils.createElement({ type: "li", "innerHTML": innerHTML }))
	}
	//div.setAttribute("style","overflow-y:scroll");
	rpanelbody.appendChild(div);

}
/** 
 *  regionUtils */
regionUtils.regionsOnOff = function () {
	overlayUtils._drawRegions = !overlayUtils._drawRegions;
	var op = tmapp["object_prefix"];
	if (overlayUtils._drawRegions) {
		document.getElementById(op + '_drawregions_btn').setAttribute("class", "btn btn-primary")
	} else {
		regionUtils.resetManager();
		document.getElementById(op + '_drawregions_btn').setAttribute("class", "btn btn-secondary")
	}
}
/** 
 *  regionUtils */
regionUtils.exportRegionsToJSON = function () {
	regionUtils.regionsToJSON();
}
/** 
 *  regionUtils */
regionUtils.importRegionsFromJSON = function () {
	var canvas = overlayUtils._d3nodes[tmapp["object_prefix"] + "_regions_svgnode"].node();
	regionsobj = d3.select(canvas);
	regionsobj.selectAll("*").remove();
	var regionsPanel = document.getElementById("markers-regions-panel");
	regionsPanel.innerText = "";
	regionUtils._regions = {};
	//regionsPanel.innerHTML="";
	regionUtils.JSONToRegions();

}

regionUtils.pointsInRegionsToCSV=function(){
	var alldata=[]
	for (r in regionUtils._regions){
		var regionPoints=regionUtils._regions[r].associatedPoints;
		regionUtils._regions[r].associatedPoints.forEach(function(p){
			alldata.push(p);
		});
		//console.log(alldata);	
	}
	var csvRows=[];
	var possibleheaders=Object.keys(alldata[0]);
	var headers=[];

	var datum=alldata[0];
	possibleheaders.forEach(function(ph){
		if(datum[ph]){
			//this is not undefined or null so add header

			headers.push(ph);
		}
	});

	csvRows.push(headers.join(','));
	

	for(var row of alldata){
		var values=[];
		headers.forEach(function(header){
			values.push(row[header]);
		});
		csvRows.push(values.join(","));
	}
	var theblobdata=csvRows.join('\n');
	regionUtils.downloadPointsInRegionsCSV(theblobdata);

}

regionUtils.downloadPointsInRegionsCSV=function(data){
	var blob = new Blob([data],{type:"text/csv"});
	var url=window.URL.createObjectURL(blob);
	var a=document.createElement("a");
	a.setAttribute("hidden","");
	a.setAttribute("href",url);
	a.setAttribute("download","pointsinregions.csv");
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}


regionUtils.regionsToJSON= function(){
	if (window.Blob) {
		var op=tmapp["object_prefix"];
		var jsonse = JSON.stringify(regionUtils._regions);
		var blob = new Blob([jsonse], {type: "application/json"});
		var url  = URL.createObjectURL(blob);
		var a=document.createElement("a");// document.getElementById("invisibleRegionJSON");
		if(document.getElementById(op+"_region_file_name")){
			var name=document.getElementById(op+"_region_file_name").value;
		}else{
			var name="regions.json";
		}
		a.href        = url;
		a.download    = name;
		a.textContent = "Download backup.json";
		a.click();
		  // Great success! The Blob API is supported.
	} else {
	  alert('The File APIs are not fully supported in this browser.');
	}		
}

regionUtils.JSONToRegions= function(filepath){
	regions={};
	if(filepath!==undefined){
		fetch(filepath)
		.then((response) => {
			return response.json();
		})
		.then((regionsobj) => {
			var maxregionid=0;
			for(i in regionsobj){
				//console.log(regions[i]);
				regionUtils.createImportedRegion(regionsobj[i]);
				var numbers = regionsobj[i].id.match(/\d+/g).map(Number);
				if(numbers[0]>maxregionid) maxregionid=numbers[0];
			}
			regionUtils._currentRegionId=maxregionid;		
		});
	}
	else if(window.File && window.FileReader && window.FileList && window.Blob) {
		var op=tmapp["object_prefix"];
		var text=document.getElementById(op+"_region_files_import");
		var file=text.files[0];
		var currentrid=0;
		if (file.type.match('json')) {	
			var reader = new FileReader();
			reader.onload=function(event) {
				// The file's text will be printed here
				var maxregionid=0;
				var regions=JSON.parse(event.target.result);
				for(i in regions){
					//console.log(regions[i]);
					regionUtils.createImportedRegion(regions[i]);
					var numbers = regions[i].id.match(/\d+/g).map(Number);
					if(numbers[0]>maxregionid) maxregionid=numbers[0];
				}
				regionUtils._currentRegionId=maxregionid;
			};
			console.log(regionUtils._currentRegionId);
			var result=reader.readAsText(file);
		}
	} else {
	  alert('The File APIs are not fully supported in this browser.');
	}
}
