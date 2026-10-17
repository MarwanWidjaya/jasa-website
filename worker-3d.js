/* worker-3d.js — Three.js rendering di Web Worker via OffscreenCanvas.
   Menerima: {type:'init', canvas, width, height, dpr, isMobile}
             {type:'scroll', journey}  (0..1)
             {type:'resize', width, height}
   Mengirim: {type:'ready'} / {type:'error', msg}
*/
importScripts('https://unpkg.com/three@0.160.0/build/three.min.js');

var renderer=null, scene=null, camera=null;
var bhGroup=null, disk=null, tessGroup=null;
var journey=0, targetJourney=0;
var isMobile=false, running=true, rafId=0;
var lastT=0;

function buildScene(canvas, W, H, DPR, mobile){
  isMobile=mobile;
  renderer=new THREE.WebGLRenderer({canvas:canvas, alpha:true, antialias:!mobile});
  renderer.setPixelRatio(Math.min(DPR, mobile?1.5:2));
  renderer.setSize(W,H,false);
  scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0x050507,0.015);
  camera=new THREE.PerspectiveCamera(62,W/H,.1,600);

  // WORLD 0: BLACK HOLE
  bhGroup=new THREE.Group();
  var bhSphere=new THREE.Mesh(
    new THREE.SphereGeometry(3,32,32),
    new THREE.MeshBasicMaterial({color:0x000000})
  );
  bhGroup.add(bhSphere);
  // Accretion disk dengan gradasi (vertex colors)
  var diskGeo=new THREE.RingGeometry(3.5,7,64,8);
  var posAttr=diskGeo.attributes.position;
  var colors=new Float32Array(posAttr.count*3);
  var cInner=new THREE.Color(0xffe8b0), cOuter=new THREE.Color(0x8a3a10), tmpC=new THREE.Color();
  for(var i=0;i<posAttr.count;i++){
    var x=posAttr.getX(i), y=posAttr.getY(i);
    var r=Math.sqrt(x*x+y*y);
    var f=Math.max(0,Math.min(1,(r-3.5)/3.5));
    tmpC.copy(cInner).lerp(cOuter,f);
    // Turbulensi: variasi brightness
    var turb=.85+.3*Math.sin(x*2.1+y*1.7)*Math.cos(y*2.3-x*1.3);
    colors[i*3]=tmpC.r*turb; colors[i*3+1]=tmpC.g*turb; colors[i*3+2]=tmpC.b*turb;
  }
  diskGeo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  disk=new THREE.Mesh(diskGeo, new THREE.MeshBasicMaterial({
    vertexColors:true, transparent:true, opacity:.92, side:THREE.DoubleSide
  }));
  disk.rotation.x=-Math.PI/2.3;
  bhGroup.add(disk);
  // Glow
  var glow=new THREE.Mesh(
    new THREE.RingGeometry(3.15,4.4,64),
    new THREE.MeshBasicMaterial({color:0xffc860, transparent:true, opacity:.35,
      side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false})
  );
  glow.rotation.x=-Math.PI/2.3;
  bhGroup.add(glow);
  // Lensing arc (cahaya yang dibengkokkan di atas)
  var arc=new THREE.Mesh(
    new THREE.TorusGeometry(4.6,.28,12,64,Math.PI),
    new THREE.MeshBasicMaterial({color:0xffd890, transparent:true, opacity:.5,
      blending:THREE.AdditiveBlending, depthWrite:false})
  );
  arc.position.y=1.2;
  bhGroup.add(arc);
  scene.add(bhGroup);

  // WORLD 2: TESSERACT
  tessGroup=new THREE.Group();
  tessGroup.add(new THREE.AmbientLight(0x8a6a4a,.95));
  var key=new THREE.DirectionalLight(0xffd9a0,1.25);
  key.position.set(10,15,5); tessGroup.add(key);
  var fill=new THREE.PointLight(0xff9a50,1.6,90);
  fill.position.set(-8,3,-195); tessGroup.add(fill);
  var rim=new THREE.PointLight(0x6a9aff,.85,90);
  rim.position.set(8,-5,-205); tessGroup.add(rim);

  var woodMat=new THREE.MeshStandardMaterial({color:0x8a5a33, roughness:.72, metalness:.06});
  var bookColors=[0x8a3a2a,0x2a5a8a,0x3a6a3a,0xd4a95a,0x5a3a6a,0xb56a3a,0x2a3a5a,0x9a2a2a];
  var shelfGeo=new THREE.BoxGeometry(3.6,.18,1.1);
  var bookGeo=new THREE.BoxGeometry(.22,.85,.75);
  var dummy=new THREE.Object3D(), col=new THREE.Color();
  var units=[];
  for(var ux=0;ux<4;ux++) for(var uy=0;uy<3;uy++) for(var uz=0;uz<4;uz++){
    var px=(ux-1.5)*4.2, py=(uy-1)*4.2, pz=-200+(uz-1.5)*4.2;
    if(Math.abs(px)<2.5 && Math.abs(py)<2.5) continue;
    units.push([px,py,pz]);
  }
  var spu=4, bps=6, nU=units.length;
  var shelfMesh=new THREE.InstancedMesh(shelfGeo,woodMat,nU*spu);
  var bookMesh=new THREE.InstancedMesh(bookGeo,
    new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8}), nU*spu*bps);
  var si=0, bi=0, s, b;
  for(var ui=0;ui<nU;ui++){
    var u=units[ui];
    for(s=0;s<spu;s++){
      var sy=u[1]-1.4+s*(2.8/(spu-1));
      dummy.position.set(u[0],sy,u[2]);
      dummy.rotation.set(0,0,0); dummy.scale.set(1,1,1);
      dummy.updateMatrix(); shelfMesh.setMatrixAt(si++,dummy.matrix);
      for(b=0;b<bps;b++){
        if(Math.random()<.15) continue;
        dummy.position.set(u[0]-1.5+b*(3/(bps-1)), sy+.5, u[2]);
        dummy.scale.set(1,.8+Math.random()*.4,1);
        dummy.rotation.set(0,(Math.random()-.5)*.12,0);
        dummy.updateMatrix(); bookMesh.setMatrixAt(bi,dummy.matrix);
        col.setHex(bookColors[(Math.random()*bookColors.length)|0]);
        bookMesh.setColorAt(bi,col); bi++;
      }
    }
  }
  shelfMesh.count=si; bookMesh.count=bi;
  shelfMesh.instanceMatrix.needsUpdate=true;
  bookMesh.instanceMatrix.needsUpdate=true;
  if(bookMesh.instanceColor) bookMesh.instanceColor.needsUpdate=true;
  tessGroup.add(shelfMesh); tessGroup.add(bookMesh);
  tessGroup.visible=false;
  scene.add(tessGroup);

  // STARFIELD
  var sc=isMobile?800:2000;
  var sp=new Float32Array(sc*3);
  for(var i=0;i<sc;i++){
    sp[i*3]=(Math.random()-.5)*400;
    sp[i*3+1]=(Math.random()-.5)*400;
    sp[i*3+2]=30-Math.random()*450;
  }
  var sg=new THREE.BufferGeometry();
  sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
  scene.add(new THREE.Points(sg,new THREE.PointsMaterial({
    color:0xffffff,size:.7,transparent:true,opacity:.9})));
}

function frame(t){
  if(!running) return;
  rafId=requestAnimationFrame(frame);
  // Hemat: skip jika tab hidden (worker tetap jalan tapi rAF di-throttle browser)
  journey+=(targetJourney-journey)*.07;
  var camZ, lookZ;
  if(journey<.35){
    var p=journey/.35;
    camZ=30-p*45; lookZ=0;
    var s=1+p*1.5;
    bhGroup.scale.set(s,s,s);
    bhGroup.visible=true;
    disk.rotation.z=t*.0003;
  } else {
    var p2=(journey-.35)/.65;
    camZ=-15-p2*215; lookZ=-200;
    bhGroup.visible=journey<.5;
  }
  camera.position.set(Math.sin(t*.0001)*2, Math.cos(t*.00007)*1.5, camZ);
  camera.lookAt(0,0,lookZ);
  tessGroup.visible=journey>.25;
  renderer.render(scene,camera);
}

onmessage=function(e){
  var m=e.data;
  try{
    if(m.type==='init'){
      buildScene(m.canvas, m.width, m.height, m.dpr, m.isMobile);
      postMessage({type:'ready'});
      rafId=requestAnimationFrame(frame);
    } else if(m.type==='scroll'){
      targetJourney=m.journey;
    } else if(m.type==='resize'){
      if(renderer && camera){
        camera.aspect=m.width/m.height;
        camera.updateProjectionMatrix();
        renderer.setSize(m.width,m.height,false);
      }
    } else if(m.type==='pause'){
      running=false; cancelAnimationFrame(rafId);
    } else if(m.type==='resume'){
      if(!running){ running=true; rafId=requestAnimationFrame(frame); }
    }
  }catch(err){
    postMessage({type:'error', msg:String(err&&err.message||err)});
  }
};
