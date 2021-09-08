/*
points are stored as point index and mapping. Like [2,[0,1]] is point 2 translated by 0 vectorA and 1 vectorB.
halfkite = [center, vertex1, vertex2]
kite = [center1, vertex1, center2, vertex2]
poly = [vertex1, vertex2, ... vertexN]
halfkiteDeg = [center, vertex1, vertex2, degree of center]
*/


var Ax;
var Ay;
var Bx;
var By;
var tiles = {
  pts : [],
  polys : []
};
var comList = "";
var midpoints = [];
var pointList = [];
var polyList = [];
var myTiling;

function mapping(rawPt, mapping) {
  var X = rawPt[0]+mapping[0]*Ax + mapping[1]*Bx;
  var Y = rawPt[1]+mapping[0]*Ay + mapping[1]*By;
  return  [X,Y] ;
}

function invMap(rawPt, mapping) {
  var X = rawPt[0]-mapping[0]*Ax - mapping[1]*Bx;
  var Y = rawPt[1]-mapping[0]*Ay - mapping[1]*By;
  return  [X,Y] ;
}

function avePts(ptList) {
  var xSum=0;
  var ySum=0;
  ptList.forEach(function(pt) {
    xSum+= pt[0];
    ySum+= pt[1];
  });
  xSum /= ptList.length;
  ySum /= ptList.length;
  return [xSum, ySum];
}

function avePtMap(ptMapList) {
  var XSum=0;
  var YSum=0;
  ptMapList.forEach(function(PtMap) {
    var newPt = mapping(tiles.pts[PtMap[0]], PtMap[1]);
    XSum+= newPt[0];
    YSum+= newPt[1];
  });
  var Xave = XSum / ptMapList.length;
  var Yave = YSum / ptMapList.length;
  return [Xave, Yave];
}

function composeMaps(maps) {
  var map0 = 0;
  var map1 = 0;
  maps.forEach(function(oldMap) {
    map0 += oldMap[0];
    map1 += oldMap[1];
  });
  return [map0, map1];
}

/* find which translation parallelogram rawPt is in */
function transPara(rawPt) {
  var denom = Ax*By-Ay*Bx;
  var M = floor((rawPt[0]*By - rawPt[1]*Bx)/denom);
  var N = floor((rawPt[1]*Ax - rawPt[0]*Ay)/denom);
  return([M,N]);
}

/* input polygon and center, average the polar coordinates to find best fit regular polygon, 
output vote where to move tiles.pts */
function avePolar(polyRawPolar,centPt) {
  var rNew = 0;
  var tBase = 0;
  var vertNum = 0;
  var numVert = polyRawPolar.length;
  polyRawPolar.forEach(function(ptMapRawPolar) {
    vertNum += 1;
    rNew += ptMapRawPolar[3][0];
    var addBaseT = ptMapRawPolar[3][1] + vertNum*2*PI/numVert;
    addBaseT %= (2*PI);
    addBaseT += (2*PI);
    addBaseT %= (2*PI);
    if (addBaseT>PI) {addBaseT -= (2*PI)};
    tBase += addBaseT;
  });

  tBase /= numVert;
  rNew /= numVert;
  var PtVoteList = [];
  var maxDist = rNew*numVert*2;
  var bestCount = 10;

  for (counter = -2;counter<3;counter++) {
    var sumDist = 0;
    vertNum = 0;
    polyRawPolar.forEach(function(ptMapRawPolar) {
      vertNum += 1;
      var tNew = tBase - (vertNum+counter)*2*PI/numVert;
      var newX = centPt[0] + rNew*cos(tNew);
      var newY = centPt[1] + rNew*sin(tNew);
      var thisDist = Math.sqrt((newX-ptMapRawPolar[2][0])**2+(newY-ptMapRawPolar[2][1])**2);
      sumDist += thisDist;
    });
    if (sumDist<maxDist) {maxDist = sumDist; bestCount=counter;};
  } /* end counter */

  vertNum = 0;
  polyRawPolar.forEach(function(ptMapRawPolar) {
    vertNum += 1;
    var tNew = tBase - (vertNum+bestCount)*2*PI/numVert;
    var newX = centPt[0] + rNew*cos(tNew);
    var newY = centPt[1] + rNew*sin(tNew);
    var newPt = invMap([newX,newY], ptMapRawPolar[1]);
    PtVoteList.push([ptMapRawPolar[0],newPt]);
  });

  return (PtVoteList);
} /* end avePolar */


function rect2Polar(rect) {
  var x = rect[0];
  var y = rect[1];
  var radius = sqrt(x*x+y*y);
  var theta;
  if (x === 0) {
    if (y < 0) { theta = 3*PI/2; }
      else { theta = PI/2;}
    } 
    else { theta = Math.atan(y/x);}
  if (x < 0) {theta += PI;}
  if (theta < 0) {theta +=2*PI;}
  return [radius, theta];
}

function addPolar(polyRaw, centPt) {
  var polyRawPolar = [];
  polyRaw.forEach(function(ptMapRaw) {
    var vecX = ptMapRaw[2][0]-centPt[0];
    var vecY = ptMapRaw[2][1]-centPt[1];
    var vecPolar = rect2Polar([vecX, vecY]);
    polyRawPolar.push([ptMapRaw[0],ptMapRaw[1],ptMapRaw[2],vecPolar]);
  });
  return polyRawPolar;
}

function polyRaw2Cent(polyRaw) {
  var rawPtList = [];
  polyRaw.forEach(function(ptMapRaw) {
    rawPtList.push(ptMapRaw[2]);
  });
  var centPt = avePts(rawPtList);
  return centPt ;
}

function polyAddRaw(poly) {
  var polyRaw = [];
  poly.forEach(function(ptMap) {
    var rawPt = mapping(tiles.pts[ptMap[0]],ptMap[1]);
    polyRaw.push([ptMap[0],ptMap[1],rawPt]);
  });
  return polyRaw;
}

/*this will try to make the polygons regular  */
/* it some times makes funny stuff happen around 2:00 on big polygons */
/* this can be fixed at times by a couple of duals */
function makeRegular() {
  var PtVoteList = [];
  tiles.polys.forEach(function(poly) {
    var polyRaw = polyAddRaw(poly);
    var centPt = polyRaw2Cent(polyRaw);
    var polyRawPolar = addPolar(polyRaw, centPt);
    /* sort by descending angle so all polygons have same orientation */
    polyRawPolar.sort((A,B)=> B[3][1]-A[3][1]);
    PtVoteList = PtVoteList.concat(avePolar(polyRawPolar,centPt));
  });
 /* sort point list by index */
  PtVoteList.sort((A,B) => A[0]-B[0]);

  var curPt = 0;
  var votesByPt = [];
  var avePtVote=[];

  /* average all votes for where to move the point */
  PtVoteList.forEach(function(ptVote) {
    if (curPt === ptVote[0]) {votesByPt.push(ptVote[1]);}
    else { 
      avePtVote.push([curPt,avePts(votesByPt)]);
      curPt = ptVote[0];
      votesByPt = [ptVote[1]];
      };
  });
  avePtVote.push([curPt,avePts(votesByPt)]);

/* don't move any fixed points - currently none.
  var fixedPts = [];
  for (counter = 0;counter<tiles.pts.length;counter++) {
    if (tiles.pts[counter][0]===0) {fixedPts[counter]=[counter,tiles.pts[counter]] }
  }; 
*/

  for (i = 0;i<avePtVote.length;i++) {
    tiles.pts[avePtVote[i][0]] = avePtVote[i][1];
  }

 /* fixedPts.forEach(function(fixedPt) {tiles.pts[fixedPt[0]]=fixedPt[1];}); */

} /* end makeRegular */

function makeRegular10Draw() {
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  draw();
}

function polys2halfkites() {
  var halfkites = [];
  tiles.polys.forEach(function(poly) {
    var centPt = avePtMap(poly);
    var centPtNum = tiles.pts.length;
    tiles.pts.push(centPt);
    var lastPtMap = poly[poly.length-1];
    poly.forEach(function(ptMap) {
      halfkites.push([[centPtNum,[0,0]],lastPtMap,ptMap]);
      lastPtMap = ptMap;
    });   
  });
  return(halfkites);
}

function polys2halfkiteDegs() {
  var halfkiteDegs = [];
  tiles.polys.forEach(function(poly) {
    var centPt = avePtMap(poly);
    var centPtNum = tiles.pts.length;
    tiles.pts.push(centPt);
    var lastPtMap = poly[poly.length-1];
    var degree = poly.length;
    poly.forEach(function(ptMap) {
      halfkiteDegs.push([[centPtNum,[0,0]],lastPtMap,ptMap,degree]);
      lastPtMap = ptMap;
    });   
  });
  return(halfkiteDegs);
}

function tri() {
  tiles.polys = polys2halfkites();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  comList += "t";
  draw();
}

function polys2kites() {
  var halfkites = polys2halfkites();
  var newHalfkites = [];

  /* if needed trade so that vertex 1 < vertex 2. translate halfkite so vertex 1 in box */
  halfkites.forEach(function(halfkite) {
    var vert1 = halfkite[1];
    var vert2 = halfkite[2];
    var trade = compare(vert1,vert2);
    if (trade===1) 
      {halfkite[1]=vert2;
       halfkite[2]=vert1;
      };
    var invA = -halfkite[1][1][0];
    var invB = -halfkite[1][1][1];
    var map0= composeMaps([[invA,invB],halfkite[0][1]]);
    var map1= composeMaps([[invA,invB],halfkite[1][1]]);
    var map2= composeMaps([[invA,invB],halfkite[2][1]]);
    var cent1 = [halfkite[0][0],map0];
    vert1 = [halfkite[1][0],map1];
    vert2 = [halfkite[2][0],map2];
    newHalfkites.push([cent1,vert1,vert2]);
  });

  /* ugly hack to sort so that matching pairs will be adjacent */
  newHalfkites.sort((A,B)=> A[2][1][1]-B[2][1][1]);
  newHalfkites.sort((A,B)=> A[2][1][0]-B[2][1][0]); 
  newHalfkites.sort((A,B)=> A[2][0]-B[2][0]); 
  newHalfkites.sort((A,B)=> A[1][1][1]-B[1][1][1]);
  newHalfkites.sort((A,B)=> A[1][1][0]-B[1][1][0]); 
  newHalfkites.sort((A,B)=> A[1][0]-B[1][0]); 

  var kites = [];
  var counter = 0;
  var oldCent = [];
  var oldVert1 = [];
  var oldVert2 = [];
  newHalfkites.forEach(function(halfkite) {
    if (counter ===0) 
      {oldCent = halfkite[0];
       oldVert1 = halfkite[1];
       oldVert2 = halfkite[2];
var raw1 = mapping(tiles.pts[oldCent[0]],oldCent[1]);
var raw2 = mapping(tiles.pts[oldVert1[0]],oldVert1[1]);
var raw3 = mapping(tiles.pts[oldVert2[0]],oldVert2[1]);
var orient = (raw2[1]-raw1[1])*(raw3[0]-raw2[0])-(raw3[1]-raw2[1])*(raw2[0]-raw1[0]);
if (orient < 0) {oldVert2 = halfkite[1];oldVert1=halfkite[2];}

       counter = 1;
      }
    else
 { //    {if (JSON.stringify(oldVert1) != JSON.stringify(halfkite[1])) 
    //       {alert([oldVert1,halfkite[1],"Error! vertices don't match"]);};
    //   if (JSON.stringify(oldVert2) != JSON.stringify(halfkite[2])) 
     //      {alert([oldVert2,halfkite[2],"Error! vertices don't match"]);};
       kites.push([halfkite[0],oldVert1,oldCent,oldVert2]);
       counter=0;
      }
  });
  return(kites);
} /* end polys2kites */

function quadd() {
  tiles.polys=polys2kites();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  comList += "q";
  draw();
}

function dualKites(kites) {
  var newKites = [];
  kites.forEach(function(kite) {
    newKites.push([kite[1],kite[2],kite[3],kite[0]]);
  });
  return (newKites);
}

function kites2halfkites(kites) {
  var halfkites = [];
  kites.forEach(function(kite) {
    halfkites.push([kite[0],kite[1],kite[3]]);
    halfkites.push([kite[2],kite[1],kite[3]]);
  }); 
  return(halfkites);
}

function halfkites2polys(halfkites) {
  var polys = [];
  var newHalfkites = [];
  /* sort by center */
  halfkites.sort((A,B)=> A[0][0]-B[0][0]);

  /* translate to make center in box */
  halfkites.forEach(function(halfkite) {
    var invA = -halfkite[0][1][0];
    var invB = -halfkite[0][1][1];
    var map0= composeMaps([[invA,invB],halfkite[0][1]]);
    var map1= composeMaps([[invA,invB],halfkite[1][1]]);
    var map2= composeMaps([[invA,invB],halfkite[2][1]]);
    var cent1 = [halfkite[0][0],map0];
    var vert1 = [halfkite[1][0],map1];
    var vert2 = [halfkite[2][0],map2];
    newHalfkites.push([cent1,vert1,vert2]);
  });

  var oldCent = newHalfkites[0][0];
  var currentList = [];
  newHalfkites.forEach(function(halfkite) {
    if (JSON.stringify(oldCent)===JSON.stringify(halfkite[0])) 
      {currentList.push(halfkite)}
    else
      {var newPoly = makePoly(currentList);
       polys.push(newPoly);
       oldCent = halfkite[0];
       currentList = [];
       currentList.push(halfkite);
      }   
  });
  var newPoly = makePoly(currentList);
  polys.push(newPoly);

  return(polys);
} /* end halfkites2polys */

function makePoly(halfkites) {
  var poly = [];
  var used = [];
  for (i=0;i<halfkites.length;i++) {
    used.push(0);
  }
  poly.push(halfkites[0][1]);
  used[0] = 1;
  var nextPt = JSON.stringify(halfkites[0][2]);

  for (i=1;i<halfkites.length;i++) {
    var nextIndex = halfkites.findIndex((halfkite, index) => 
           JSON.stringify(halfkite[1])===nextPt && used[index]===0);
    if (nextIndex >=0) 
      {poly.push(halfkites[nextIndex][1]);
       nextPt = JSON.stringify(halfkites[nextIndex][2]);
       used[nextIndex]=1;
      }
    else
      {nextIndex = halfkites.findIndex((halfkite, index) => 
           JSON.stringify(halfkite[2])===nextPt && used[index]===0);
       if (nextIndex<0) {alert("Error: point not found.")};
       poly.push(halfkites[nextIndex][2]);
       nextPt = JSON.stringify(halfkites[nextIndex][1]);
       used[nextIndex]=1;
      }
  } /* end for loop */

  return(poly);
} /* end makePoly */

function dual() {
  dualNoDraw();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  comList += "d";
  draw();
} /* end dual */

function dualNoDraw() {
  var kites = polys2kites();
  kites = dualKites(kites);
  var halfkites = kites2halfkites(kites);
  tiles.polys =halfkites2polys(halfkites);
} /* end dualNoDraw*/

function findMid(pt1,pt2) {
  /* makes copies */
  var P1 = JSON.parse(JSON.stringify(pt1));
  var P2 = JSON.parse(JSON.stringify(pt2));

  var trade = compare(P1,P2);
  if (trade===1) 
    {P1=JSON.parse(JSON.stringify(pt2));
     P2=JSON.parse(JSON.stringify(pt1));
    };
  
  /* move P1 into parallelogram */
  var unmap = [-P1[1][0],-P1[1][1]];
  P1[1] = [0,0];
  P2[1] = composeMaps([unmap,P2[1]]);
  var nextIndex = midpoints.findIndex((midPt) =>
       JSON.stringify(P1)===midPt[0] && JSON.stringify(P2)===midPt[1]);
  if (nextIndex < 0)
    {midpoints.push([JSON.stringify(P1),JSON.stringify(P2),tiles.pts.length]);
     tiles.pts.push(avePtMap([P1,P2]));
     return[tiles.pts.length-1,[-unmap[0],-unmap[1]]];
    }
  else /* repeated point */
    {return[midpoints[nextIndex][2],[-unmap[0],-unmap[1]]];
     }
} /* end findMid */

function pentafill() {
  var polys = [];
  var halfkites = [];
  midpoints = [];
  var kites = polys2kites();

  kites.forEach(function(kite) {
    var C1 = kite[0];
    var V1 = kite[1];
    var C2 = kite[2];
    var V2 = kite[3];

    var A1 = findMid(C1,V1);
    var A2 = findMid(C1,V2);
    var A3 = findMid(C2,V1);
    var A4 = findMid(C2,V2);

    var B1 = findMid(A1,A2);
    var B2 = findMid(A3,A4);

    polys.push([V1,A1,B1,B2,A3]);
    polys.push([V2,A2,B1,B2,A4]);
    halfkites.push([C1,A1,B1]);
    halfkites.push([C1,A2,B1]);
    halfkites.push([C2,A3,B2]);
    halfkites.push([C2,A4,B2]);
  });

  var newPolys = halfkites2polys(halfkites);
  polys = polys.concat(newPolys);
  tiles.polys=polys;

  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  comList += "f";
  draw();

} /* end pentafill */



function penta() {
  var polys = [];
  var halfkites = [];
  midpoints = [];
  var kites = polys2kites();

  kites.forEach(function(kite) {
    var C1 = kite[0];
    var V1 = kite[1];
    var C2 = kite[2];
    var V2 = kite[3];

    var A1 = findMid(C1,V1);
    var A2 = findMid(C1,V2);
    var A3 = findMid(C2,V1);
    var A4 = findMid(C2,V2);

    var B1 = findMid(C1,A3);
    var B2 = findMid(C2,A2);

    halfkites.push([A1,V1,B1]);
    halfkites.push([A1,B1,C1]);
    halfkites.push([A2,C1,B1]);
    halfkites.push([A2,B1,B2]);
    halfkites.push([A2,B2,V2]);
    halfkites.push([A3,C2,B2]);
    halfkites.push([A3,B2,B1]);
    halfkites.push([A3,B1,V1]);
    halfkites.push([A4,V2,B2]);
    halfkites.push([A4,B2,C2]);
  });

  var newPolys = halfkites2polys(halfkites);
  polys = polys.concat(newPolys);
  tiles.polys=polys;
/*
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  comList += "p";
*/
  draw();

} /* end penta */


function hexfill() {
  var polys = [];
  var newHalfkites = [];
  midpoints = [];
  var halfkiteDegs = polys2halfkiteDegs();

  halfkiteDegs.forEach(function(halfkiteDeg) {
    var C1 = halfkiteDeg[0];
    var V1 = halfkiteDeg[1];
    var V2 = halfkiteDeg[2];
    var degree = halfkiteDeg[3];

    if (degree <=4) {    
      var A1 = findMid(V1,V2);
      newHalfkites.push([A1,V2,C1]);
      newHalfkites.push([A1,C1,V1]);
    };
    if (degree >4 && degree < 7) {
      var A1 = findMid(V1,V2);
      var A2 = findMid(C1,V1);
      var A3 = findMid(C1,V2);
      var A4 = findMid(A2,A3);
      newHalfkites.push([A1,V1,A4]);
      newHalfkites.push([A1,A4,V2]);
      newHalfkites.push([A2,C1,A4]);
      newHalfkites.push([A2,A4,V1]);
      newHalfkites.push([A3,V2,A4]);
      newHalfkites.push([A3,A4,C1]);
    };
    if (degree >=7) {
      var A1 = findMid(V1,V2);
      var A2 = findMid(C1,V1);
      var A3 = findMid(C1,V2);
      var A4 = findMid(A2,A3);

      polys.push([V1,C1,A4]);
      polys.push([V2,C1,A4]);
      newHalfkites.push([A1,V2,A4]);
      newHalfkites.push([A1,A4,V1]);
    };

  });

  var newPolys = halfkites2polys(newHalfkites);
  polys = polys.concat(newPolys);
  tiles.polys=polys;
  dual();
/*
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
*/
  comList += "h";

  draw();

} /* end hexfill */


function hex2fill() {
  var polys = [];
  var newHalfkites = [];
  midpoints = [];
  var halfkiteDegs = polys2halfkiteDegs();

  halfkiteDegs.forEach(function(halfkiteDeg) {
    var C1 = halfkiteDeg[0];
    var V1 = halfkiteDeg[1];
    var V2 = halfkiteDeg[2];
    var degree = halfkiteDeg[3];

    if (degree <=4) {    
      var A1 = findMid(V1,V2);
      newHalfkites.push([A1,V1,C1]);
      newHalfkites.push([A1,C1,V2]);
    };
    if (degree >4 && degree < 8) {
      var A1 = findMid(V1,V2);
      var A2 = findMid(C1,V1);
      var A3 = findMid(C1,V2);
      var A4 = findMid(A2,A3);
      newHalfkites.push([A1,V1,A4]);
      newHalfkites.push([A1,A4,V2]);
      newHalfkites.push([A2,C1,A4]);
      newHalfkites.push([A2,A4,V1]);
      newHalfkites.push([A3,V2,A4]);
      newHalfkites.push([A3,A4,C1]);
    };
    if (degree >=8) {
      var A1 = findMid(V1,V2);
      var A2 = findMid(C1,V1);
      var A3 = findMid(C1,V2);
      var A4 = findMid(A2,A3);

      polys.push([V1,C1,A4]);
      polys.push([C1,V2,A4]);
      newHalfkites.push([A1,V1,A4]);
      newHalfkites.push([A1,A4,V2]);
    };

  });

  var newPolys = halfkites2polys(newHalfkites);
  polys = polys.concat(newPolys);
  tiles.polys=polys;
  dual();

  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  makeRegular();
  comList += "h2";


  draw();

} /* end hex2fill */



function compare(vert1, vert2) {
if (JSON.stringify(vert1[0])===JSON.stringify(vert2[0])) {/*alert([vert1,vert2])*/};

  var trade = 0;
  if (vert1[0]>vert2[0]) 
    {trade = 1}
  else { 

    if (vert1[0]===vert2[0]) 
      {if (vert1[1][0]>vert2[1][0]) 
         {trade = 1;}
       else {
         if (vert1[1][0]===vert2[1][0])
           {if (vert1[1][1]>vert2[1][1])
             {trade = 1}
           }
         }
      }
  }
  return trade;
}



function SVG() {

  var output = [];
  output.push('<svg height="600" width="600">');

  tiles.polys.forEach(function(poly) {
    for (i = 0;i<1;i++) {
      for (j = 0;j<1;j++) {
        output.push('<polygon points="'); 
        poly.forEach(function(ptMap) {
          var newPoint = mapping(tiles.pts[ptMap[0]],ptMap[1]);
          output.push(" " + (newPoint[0]+i*Ax+j*Bx) + "," + (newPoint[1]+i*Ay+j*By));	
        });
        output.push('" style="fill:none;stroke:black;stroke-width:0.2" />'); 
      } /* end j loop */

    } /* end i loop */

  });
  output.push('</svg>');
  saveStrings(output,"myTiling","svg");

} /* end SVG() */

function OldsaveData() {

  var output = [];
  output.push('vectors:'); 
  output.push(' ' + Ax + "," + Ay); 
  output.push(' ' + Bx + "," + By); 
  output.push('points:'); 
  tiles.pts.forEach(function(pt) {
    var newLine = " " + (pt[0]) + "," + (pt[1]);
    output.push(newLine); 
  });
  output.push('polys:'); 
  tiles.polys.forEach(function(poly) {
    output.push('Next Poly:'); 
    poly.forEach(function(ptMap) {
      var newLine = " " + (ptMap[0]) + ",[" + (ptMap[1][0]) + "," + (ptMap[1][1]) + "]";
      output.push(newLine); 
    });
  });
  saveStrings(output,"myTileData");
}

function saveData() {
  var asOutput = [];
  asOutput.push('vectors:');
  asOutput.push(""+Ax+","+Ay);
  asOutput.push(""+Bx+","+By);
  asOutput.push('points:');
  tiles.pts.forEach(function(point) {
    asOutput.push(""+point[0]+","+point[1]);
  });
  tiles.polys.forEach(function(poly) {
    asOutput.push('poly:');
    poly.forEach(function(ptMap) {
      asOutput.push(""+ptMap[0]+","+ptMap[1][0]+","+ptMap[1][1]);
    });
  });
  asOutput.push('end');
  saveStrings(asOutput,"myTiles","txt");
}


/* init square tiling */
function squares() {
  tiles.pts = [[1,1]];
  tiles.polys = [
    [[0,[0,0]],[0,[1,0]],[0,[1,1]],[0,[0,1]]]
    
  ];
  var size = windowHeight-15;
  if (size > windowWidth - 200) {size = windowWidth - 200};
  Ax=size/2-10;
//Ax = size-10;
  Ay=0;
  Bx=0;
  By=Ax;
  comList = "S";
  draw();
}

/* init triangle tiling */
function triangles() {
  tiles.pts = [[2,1]];
  tiles.polys = [
    [[0,[0,0]],[0,[0,1]],[0,[1,0]]],
    [[0,[1,0]],[0,[0,1]],[0,[1,1]]]
  ];
  var size = windowHeight-15;
  if (size > windowWidth - 200) {size = windowWidth - 200};
  Ax=size/1.8-10;
  Ay=0;
  Bx=Ax/2;
  By=Bx*Math.sqrt(3);
  comList = "T";
}

/* init hexagon tiling */
function hexagons() {
  triangles();
  dual();
  comList = "H";
  draw();
}

function makeButtons() {
  sqBut = createButton('Squares');
  sqBut.position(0, 0);
  sqBut.mousePressed(squares);
  hexBut = createButton('Hexagons');
  hexBut.position(0, 25);
  hexBut.mousePressed(hexagons);

  dualBut = createButton('Dual');
  dualBut.position(0, 75);
  dualBut.mousePressed(dual);
  triBut = createButton('Tri');
  triBut.position(0, 100);
  triBut.mousePressed(tri);
  quadBut = createButton('Quad');
  quadBut.position(0, 125);
  quadBut.mousePressed(quadd);
  pentaBut = createButton('Penta');
  pentaBut.position(0, 150);
  pentaBut.mousePressed(penta);
  pfillBut = createButton('PentaFill');
  pfillBut.position(0, 175);
  pfillBut.mousePressed(pentafill);
  hexfillBut = createButton('HexFill');
  hexfillBut.position(0, 200);
  hexfillBut.mousePressed(hexfill);
  hex2fillBut = createButton('Hex2Fill');
  hex2fillBut.position(0, 225);
  hex2fillBut.mousePressed(hex2fill);

  regBut = createButton('More Regular');
  regBut.position(0, 275);
  regBut.mousePressed(makeRegular10Draw);
  svgBut = createButton('Save SVG');
  svgBut.position(0, 300);
  svgBut.mousePressed(SVG);
  dataBut = createButton('Save data');
  dataBut.position(0, 325);
  dataBut.mousePressed(saveData);
}




function loadTiling(file) {
  var lines = file.data.split(/\r\n|\n/);
  tiles.pts = [];
  tiles.polys = [];
//  var numPts = lines[1];
  var curLen = lines.length;
  var setPoly = 0;

  for (i = 1;i<curLen;i++) {
    if (lines[i] === "points:") { setPoly = 1; continue;}
    if (lines[i] === "poly:") { setPoly = 2; curPoly = []; continue;}
    if (lines[i] === "end") { break;}
    var coords = lines[i].split(",");
    if (i===1) {Ax = coords[0],Ay=coords[1]}
    if (i===2) {Bx = coords[0],By=coords[1]}

    if (setPoly === 1) {tiles.pts.push([float(coords[0]),float(coords[1])]);}
    if (setPoly === 2) {
      curPoly.push( [int(coords[0]),[int(coords[1]),int(coords[2])]] );
      if (lines[i+1] === "poly:") {tiles.polys.push(curPoly);curPoly = [];};
      if (lines[i+1] === "end") {tiles.polys.push(curPoly);curPoly = [];};
    }
  }

//alert(JSON.stringify(tiles));
draw();

} // end handleFile()







function setup() {
  createCanvas(windowWidth, windowHeight);
  makeButtons();
  squares();
  myTiling = createFileInput(loadTiling);
  myTiling.position(0, 400);
}

function draw() {
  fill(220);
  strokeWeight(0);
  rect(0,0,windowWidth, windowHeight);

  strokeWeight(1);
  tiles.polys.forEach(function(poly) {
    for (i = -2;i<5;i++) {
      for (j = -2;j<5;j++) {
        beginShape();
          poly.forEach(function(ptMap) {
            var newPoint = mapping(tiles.pts[ptMap[0]],ptMap[1]);
            var xx = (newPoint[0]+200+i*Ax+j*Bx);
            var yy = (newPoint[1]+15+i*Ay+j*By);
            vertex(xx,yy);	
          });
        endShape(CLOSE);
      } /* end j loop */
    } /* end i loop */
  });

  strokeWeight(0);
  rect(0,0,200,windowHeight);
  rect(200,0,windowWidth,15);
  strokeWeight(1);
  line(200,0,200,windowHeight);
  line(200,15,windowWidth,15);
  fill(0);
  text(comList,205,12);
  noLoop();
}