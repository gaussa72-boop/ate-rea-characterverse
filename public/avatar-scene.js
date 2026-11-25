import * as THREE from "three";

const mount = document.getElementById("avatar-stage");
if (mount) {
  const canvas = document.createElement("canvas");
  canvas.id = "avatar-canvas";
  canvas.setAttribute("aria-label", "Interaktiver 3D-Charakteravatar");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y";
  mount.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, mount.clientWidth / mount.clientHeight, .1, 100);
  camera.position.set(0, 1.55, 7.2);
  const ambient = new THREE.HemisphereLight(0xb9d8ff, 0x34213d, 2.2);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffdfaa, 3.5); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.PointLight(0x64eaff, 38, 12); rim.position.set(-3, 2, -2); scene.add(rim);
  const gold = new THREE.PointLight(0xffb94d, 28, 10); gold.position.set(2, -1, 2); scene.add(gold);

  const root = new THREE.Group(); scene.add(root);
  const mats = {
    skin: new THREE.MeshPhysicalMaterial({ color: 0xd7a98d, roughness: .52, metalness: .02 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x243d68, roughness: .38, metalness: .42 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf2c76e, metalness: .82, roughness: .2, emissive: 0x5b3510 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x17233c, roughness: .3, metalness: .22 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x75efff, emissive: 0x26bfff, emissiveIntensity: 2.4 })
  };
  function mesh(geo, mat, x, y, z, parent=root) { const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m; }
  const body = mesh(new THREE.CapsuleGeometry(.55,.95,8,16),mats.cloth,0,-.95,0); body.scale.set(1.05,1.08,.72);
  const chest = mesh(new THREE.SphereGeometry(.58,32,24),mats.cloth,0,-.48,0); chest.scale.set(1.05,.62,.72);
  const neck = mesh(new THREE.CylinderGeometry(.16,.2,.34,20),mats.skin,0,.18,0);
  const headGroup = new THREE.Group(); headGroup.position.y=.85; root.add(headGroup);
  const head = mesh(new THREE.SphereGeometry(.48,40,32),mats.skin,0,0,0,headGroup); head.scale.set(.82,1.13,.78);
  const hairCap = mesh(new THREE.SphereGeometry(.51,32,20,0,Math.PI*2,0,Math.PI*.58),mats.hair,0,.12,-.025,headGroup); hairCap.scale.set(.91,1.18,.88);
  const fringe = mesh(new THREE.BoxGeometry(.68,.18,.22),mats.hair,0,.37,.31,headGroup); fringe.rotation.z=-.06;
  const earGeo = new THREE.SphereGeometry(.105,16,12);
  mesh(earGeo,mats.skin,-.4,-.02,0,headGroup); mesh(earGeo,mats.skin,.4,-.02,0,headGroup);
  const eyeGeo = new THREE.SphereGeometry(.045,16,12);
  mesh(eyeGeo,mats.eye,-.16,.06,.365,headGroup); mesh(eyeGeo,mats.eye,.16,.06,.365,headGroup);
  const nose = mesh(new THREE.ConeGeometry(.055,.16,12),mats.skin,0,-.03,.39,headGroup); nose.rotation.x=Math.PI/2;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.72,.025,12,96),mats.gold); halo.position.y=.42; halo.rotation.x=Math.PI/2.6; root.add(halo);
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(1.12,.009,8,96),new THREE.MeshBasicMaterial({color:0x6beaff,transparent:true,opacity:.7})); halo2.rotation.x=1.2; halo2.rotation.y=.35; root.add(halo2);
  const sigil = mesh(new THREE.OctahedronGeometry(.16,1),mats.gold,0,-.55,.57); sigil.rotation.z=Math.PI/4;
  const shoulderGeo = new THREE.SphereGeometry(.23,20,16);
  mesh(shoulderGeo,mats.gold,-.54,-.38,0).scale.set(1,.7,.7); mesh(shoulderGeo,mats.gold,.54,-.38,0).scale.set(1,.7,.7);

  const stars = new THREE.Group(); scene.add(stars);
  for(let i=0;i<110;i++){const s=mesh(new THREE.SphereGeometry(.012+Math.random()*.018,6,6),new THREE.MeshBasicMaterial({color:i%4===0?0xffd98b:0x7deaff}), (Math.random()-.5)*8,(Math.random()-.5)*5,(Math.random()-.5)*4,stars);}
  let targetX=0,targetY=0,drag=false,lastX=0;
  canvas.addEventListener("pointerdown",e=>{drag=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener("pointermove",e=>{if(drag){targetY+=(e.clientX-lastX)*.008;lastX=e.clientX}});
  canvas.addEventListener("pointerup",()=>drag=false);
  canvas.addEventListener("pointercancel",()=>drag=false);
  const palette={ate_rea:[0x243d68,0xf2c76e],aite:[0x194d66,0x75efff],ionos:[0x34275e,0x9b8bff],shea:[0x6b3558,0xffc1dc],aleron:[0x46516c,0xe3d4a0],urlichta:[0x5b4a20,0xffe9a3]};
  function setProfile(profile={}) {
    const id=profile.id||profile.characterId||"custom";
    const colors=palette[id]||[0x243d68,0xf2c76e];
    mats.cloth.color.setHex(colors[0]); mats.gold.color.setHex(colors[1]);
    const name=(profile.name||"").toLowerCase();
    if(name.includes("shea")){mats.hair.color.setHex(0x492c48);mats.skin.color.setHex(0xe5b9a4)}
    else if(name.includes("ionos")){mats.hair.color.setHex(0x111b3d);mats.skin.color.setHex(0xb9c7e0)}
    else {mats.hair.color.setHex(0x17233c);mats.skin.color.setHex(0xd7a98d)}
    root.userData.characterName=profile.name||"Ate Rea";
  }
  window.AteReaAvatar={setProfile};
  let frame=0;
  function animate(){requestAnimationFrame(animate);frame+=.01;root.rotation.y+=(targetY-root.rotation.y)*.035;root.position.y=Math.sin(frame)*.055;headGroup.rotation.y=Math.sin(frame*.65)*.06;halo.rotation.z+=.003;halo2.rotation.z-=.002;stars.rotation.y+=.00035;renderer.render(scene,camera)}
  const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
  new ResizeObserver(resize).observe(mount); resize(); setProfile({}); animate();
}
