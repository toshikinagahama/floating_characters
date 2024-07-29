import React, { useRef, useState, useEffect, Suspense, useMemo } from "react";
import * as THREE from "three";
import { DoubleSide } from "three";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, useHelper, PointLightHelper } from "@react-three/drei";
import { useControls } from "leva";

function MyLine({ color, ...props }) {
  const size = 20; //大きさ
  const ref = useRef();
  const [points, setPoints] = useState([new THREE.Vector3(0, 0, 0)]);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isFinishWrite, setIsFinishWrite] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const refLineGeometries = useRef([]);
  const refLineRegions = useRef([]); //どの領域に属すのか
  const refRegions = useRef({});

  const [angle, setAngle] = useState(0.0);
  const options = useMemo(() => {
    return {
      isAnimation: true,
    };
  }, []);
  //const p = useControls("Action", options);

  useFrame((state, delta, xrFrame) => {
    if (isFinishWrite == true) {
      //物理演算
      //z方向が鉛直方向
      const keys = Object.keys(refRegions.current);
      for (let i = 0; i < keys.length; i++) {
        if (i == selectedIndex) {
          continue;
        }
        const a = refRegions.current[keys[i]].a;
        const b = refRegions.current[keys[i]].b;
        const c = refRegions.current[keys[i]].c;
        const d = refRegions.current[keys[i]].d;
        const a_d = refRegions.current[keys[i]].a_d;
        const b_d = refRegions.current[keys[i]].b_d;
        const c_d = refRegions.current[keys[i]].c_d;
        const d_d = refRegions.current[keys[i]].d_d;
        //各メッシュの点に物理演算
        // ma = -kx - cv + mg + f1(浮力) + f2(外力)
        // 質量
        const m_a = 3.2;
        const m_b = 3.2;
        const m_c = 3;
        const m_d = 3;
        //減速係数
        const c_all = 1; //減速係数
        //バネ係数
        const k_all = 100; //バネ係数
        //浮力
        const f1_a = new THREE.Vector3(0.0, 0.0, 0);
        const f1_b = new THREE.Vector3(0.0, 0.0, 0);
        const f1_c = new THREE.Vector3(0.0, 0.0, 100);
        const f1_d = new THREE.Vector3(0.0, 0.0, 100);
        //外力
        const f2_a = new THREE.Vector3(
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 30,
        );
        const f2_b = new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 30,
        );
        const f2_c = new THREE.Vector3(
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 30,
        );
        const f2_d = new THREE.Vector3(
          (Math.random() - 0.5) * 70,
          (Math.random() - 0.5) * 70,
          (Math.random() - 0.5) * 30,
        );
        const gra = new THREE.Vector3(0, 0, -14.0);
        //aにかかる力, ab, adの張力
        const l_ab = b
          .clone()
          .sub(a)
          .normalize()
          .multiplyScalar(b.distanceTo(a) - size);
        const l_bc = c
          .clone()
          .sub(b)
          .normalize()
          .multiplyScalar(c.distanceTo(b) - size);
        const l_cd = d
          .clone()
          .sub(c)
          .normalize()
          .multiplyScalar(d.distanceTo(c) - size);
        const l_da = a
          .clone()
          .sub(d)
          .normalize()
          .multiplyScalar(a.distanceTo(d) - size);
        //if (l_ab.dot(l_ab) <= size * size) {
        //  //張力がゼロ
        //  l_ab.x = 0.0;
        //  l_ab.y = 0.0;
        //  l_ab.z = 0.0;
        //}
        //if (l_bc.dot(l_bc) <= size * size) {
        //  //張力がゼロ
        //  l_bc.x = 0.0;
        //  l_bc.y = 0.0;
        //  l_bc.z = 0.0;
        //}
        //if (l_cd.dot(l_cd) <= size * size) {
        //  //張力がゼロ
        //  l_cd.x = 0.0;
        //  l_cd.y = 0.0;
        //  l_cd.z = 0.0;
        //}
        //if (l_da.dot(l_da) <= size * size) {
        //  //張力がゼロ
        //  l_da.x = 0.0;
        //  l_da.y = 0.0;
        //  l_da.z = 0.0;
        //}
        const f_a = l_ab
          .clone()
          .multiplyScalar(k_all)
          .add(l_da.clone().multiplyScalar(-k_all)) //逆方向
          .add(gra.clone().multiplyScalar(m_a))
          .add(a_d.clone().multiplyScalar(-c_all).add(f1_a).add(f2_a));
        const f_b = l_ab
          .clone()
          .multiplyScalar(-k_all) //逆方向
          .add(l_bc.clone().multiplyScalar(k_all))
          .add(gra.clone().multiplyScalar(m_b))
          .add(b_d.clone().multiplyScalar(-c_all).add(f1_b).add(f2_b));
        const f_c = l_bc
          .clone()
          .multiplyScalar(-k_all) //逆方向
          .add(l_cd.clone().multiplyScalar(k_all))
          .add(gra.clone().multiplyScalar(m_c))
          .add(c_d.clone().multiplyScalar(-c_all).add(f1_c).add(f2_c));
        const f_d = l_cd
          .clone()
          .multiplyScalar(-k_all) //逆方向
          .add(l_da.clone().multiplyScalar(k_all))
          .add(gra.clone().multiplyScalar(m_d))
          .add(d_d.clone().multiplyScalar(-c_all).add(f1_d).add(f2_d));
        const dt = 0.01;
        refRegions.current[keys[i]].a_d2 = f_a.clone().multiplyScalar(m_a);
        refRegions.current[keys[i]].b_d2 = f_b.clone().multiplyScalar(m_b);
        refRegions.current[keys[i]].c_d2 = f_c.clone().multiplyScalar(m_c);
        refRegions.current[keys[i]].d_d2 = f_d.clone().multiplyScalar(m_d);
        refRegions.current[keys[i]].a_d.add(
          refRegions.current[keys[i]].a_d2.clone().multiplyScalar(dt),
        );
        refRegions.current[keys[i]].b_d.add(
          refRegions.current[keys[i]].b_d2.clone().multiplyScalar(dt),
        );
        refRegions.current[keys[i]].c_d.add(
          refRegions.current[keys[i]].c_d2.clone().multiplyScalar(dt),
        );
        refRegions.current[keys[i]].d_d.add(
          refRegions.current[keys[i]].d_d2.clone().multiplyScalar(dt),
        );
        refRegions.current[keys[i]].a.add(
          refRegions.current[keys[i]].a_d.clone().multiplyScalar(dt),
        );
        refRegions.current[keys[i]].b.add(
          refRegions.current[keys[i]].b_d.clone().multiplyScalar(dt),
        );
        refRegions.current[keys[i]].c.add(
          refRegions.current[keys[i]].c_d.clone().multiplyScalar(dt),
        );
        refRegions.current[keys[i]].d.add(
          refRegions.current[keys[i]].d_d.clone().multiplyScalar(dt),
        );
        if (refRegions.current[keys[i]].a.z < 0) {
          refRegions.current[keys[i]].a.z = 0;
          refRegions.current[keys[i]].a_d.z = 0;
          refRegions.current[keys[i]].a_d2.z = 0;
        }
        if (refRegions.current[keys[i]].b.z < 0) {
          refRegions.current[keys[i]].b.z = 0;
          refRegions.current[keys[i]].b_d.z = 0;
          refRegions.current[keys[i]].b_d2.z = 0;
        }
        if (refRegions.current[keys[i]].c.z < 0) {
          refRegions.current[keys[i]].c.z = 0;
          refRegions.current[keys[i]].c_d.z = 0;
          refRegions.current[keys[i]].c_d2.z = 0;
        }
        if (refRegions.current[keys[i]].d.z < 0) {
          refRegions.current[keys[i]].d.z = 0;
          refRegions.current[keys[i]].d_d.z = 0;
          refRegions.current[keys[i]].d_d2.z = 0;
        }
      }
      for (let i = 0; i < refLineGeometries.current.length; i++) {
        const positions =
          refLineGeometries.current[i].getAttribute("position").array;
        const positionsNew = new Float32Array(positions.length);
        const vertices = []; //attributesからveticesに
        for (let ii = 0; ii < positions.length; ii++) {
          if (ii % 3 == 2) {
            vertices.push(
              new THREE.Vector3(
                positions[ii - 2],
                positions[ii - 1],
                positions[ii],
              ),
            );
          }
        }
        if (refLineRegions.current[i] != null) {
          const key = refLineRegions.current[i][0].key;
          const a = refRegions.current[key].a;
          const b = refRegions.current[key].b;
          const c = refRegions.current[key].c;
          const d = refRegions.current[key].d;
          const o = refRegions.current[key].o;
          for (let ii = 0; ii < vertices.length; ii++) {
            if (refLineRegions.current[i][ii] == null) continue;
            const s = refLineRegions.current[i][ii].s;
            const t = refLineRegions.current[i][ii].t;
            const oNew = new THREE.Vector3(
              0.25 * (a.x + b.x + c.x + d.x),
              0.25 * (a.y + b.y + c.y + d.y),
              0.25 * (a.z + b.z + c.z + d.z),
            );

            const oa = new THREE.Vector3(a.x, a.y, a.z).sub(oNew);
            const ob = new THREE.Vector3(b.x, b.y, b.z).sub(oNew);
            const oc = new THREE.Vector3(c.x, c.y, c.z).sub(oNew);
            const od = new THREE.Vector3(d.x, d.y, d.z).sub(oNew);
            //
            vertices[ii].x =
              oNew.x +
              0.25 *
                ((1.0 - s) * (1.0 - t) * oa.x +
                  (1.0 + s) * (1.0 - t) * ob.x +
                  (1.0 + s) * (1.0 + t) * oc.x +
                  (1.0 - s) * (1.0 + t) * od.x);
            vertices[ii].y =
              oNew.y +
              0.25 *
                ((1.0 - s) * (1.0 - t) * oa.y +
                  (1.0 + s) * (1.0 - t) * ob.y +
                  (1.0 + s) * (1.0 + t) * oc.y +
                  (1.0 - s) * (1.0 + t) * od.y);
            vertices[ii].z =
              oNew.z +
              0.25 *
                ((1.0 - s) * (1.0 - t) * oa.z +
                  (1.0 + s) * (1.0 - t) * ob.z +
                  (1.0 + s) * (1.0 + t) * oc.z +
                  (1.0 - s) * (1.0 + t) * od.z);
          }

          for (let ii = 0; ii < positions.length; ii++) {
            if (ii % 3 == 0) positionsNew[ii] = vertices[Math.floor(ii / 3)].x;
            else if (ii % 3 == 1)
              positionsNew[ii] = vertices[Math.floor(ii / 3)].y;
            else if (ii % 3 == 2)
              positionsNew[ii] = vertices[Math.floor(ii / 3)].z;
          }

          refLineGeometries.current[i].setAttribute(
            "position",
            new THREE.BufferAttribute(positionsNew, 3),
          );
          refLineGeometries.current[i].attributes.position.needsUpdate = true;
        }
      }
      if (angle < Math.PI / 2 - 1.1) {
        setAngle(angle + 0.01);
      }
      //const q = new THREE.Quaternion(
      //  u.x * Math.sin(angle / 2),
      //  u.y * Math.sin(angle / 2),
      //  u.z * Math.sin(angle / 2),
      //  Math.cos(angle / 2),
      //);
      state.camera.position.set(
        0,
        100 * Math.sin(-angle),
        100 * Math.cos(-angle),
      );
      state.camera.lookAt(new THREE.Vector3(0, 0, 0));
    } else {
      state.camera.position.set(
        0,
        100 * Math.sin(-angle),
        100 * Math.cos(-angle),
      );
      state.camera.lookAt(new THREE.Vector3(0, 0, 0));
    }
  });
  return (
    <group ref={ref} position={[0, 0, 0]}>
      <spotLight
        color="white"
        intensity={5}
        position={[0, 0, 100]}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        decay={0.0}
        penumbra={0.0}
        castShadow
      />
      <mesh
        position={[0, 0, -0.01]}
        scale={[200, 200, 1]}
        castShadow
        receiveShadow
        onPointerDown={(e) => {
          setIsMouseDown(true);
          //lineGeometryを追加
          refLineGeometries.current.push(
            new THREE.BufferGeometry().setFromPoints([]),
          );
          //console.log(e);
        }}
        onPointerUp={(e) => {
          setIsMouseDown(false);
          //console.log(e);
        }}
        onPointerOut={(e) => {
          setIsMouseDown(false);
          //console.log(e);
        }}
        onPointerMove={(e) => {
          if (isMouseDown) {
            //console.log(refLineGeometries.current);
            const targetIndex = refLineGeometries.current.length - 1;
            const pi = e.intersections[0].point; //intersection point
            //console.log(pi);
            const positions =
              refLineGeometries.current[targetIndex].getAttribute(
                "position",
              ).array;
            const positionsNew = new Float32Array(positions.length + 3);
            for (let i = 0; i < positions.length; i++) {
              positionsNew[i] = positions[i];
            }
            positionsNew[positions.length + 0] = pi.x;
            positionsNew[positions.length + 1] = pi.y;
            positionsNew[positions.length + 2] = pi.z;

            refLineGeometries.current[targetIndex].setAttribute(
              "position",
              new THREE.BufferAttribute(positionsNew, 3),
            );
            refLineGeometries.current[
              targetIndex
            ].attributes.position.needsUpdate = true;
          }
        }}
      >
        <planeGeometry />
        <meshStandardMaterial color="#faebd7" side={DoubleSide} />
      </mesh>
      <mesh
        position={[-40, 70, 0]}
        scale={[15, 5, 1]}
        onPointerDown={() => {
          refLineGeometries.current = [];
          refLineRegions.current = [];
          refRegions.current = [];
          setAngle(0.0);
          setIsFinishWrite(false);
        }}
      >
        <planeGeometry />
        <meshBasicMaterial color="black" side={DoubleSide} />
      </mesh>
      <mesh
        position={[40, 70, 0]}
        scale={[15, 5, 1]}
        onPointerDown={() => {
          //console.log(refLineGeometries);
          //あらかじめ領域マップを定義
          refRegions.current = {};
          //どの平面に属すのか計算
          for (let i = 0; i < refLineGeometries.current.length; i++) {
            let center = [0.0, 0.0, 0.0]; //x,y,z
            const positions =
              refLineGeometries.current[i].getAttribute("position").array;
            if (positions.length < 3) {
              continue;
            }
            const vertices = []; //attributesからveticesに
            for (let ii = 0; ii < positions.length; ii++) {
              center[ii % 3] += positions[ii];
              if (ii % 3 == 2) {
                vertices.push(
                  new THREE.Vector3(
                    positions[ii - 2],
                    positions[ii - 1],
                    positions[ii],
                  ),
                );
              }
            }
            for (let ii = 0; ii < 3; ii++) {
              center[ii] /= positions.length / 3;
            }
            //console.log(center);
            let x_index1 = Math.floor(center[0] / size);
            let x_index2 = Math.ceil(center[0] / size);
            let y_index1 = Math.floor(center[1] / size);
            let y_index2 = Math.ceil(center[1] / size);
            x_index1 = parseInt(x_index1 + "");
            x_index2 = parseInt(x_index2 + "");
            y_index1 = parseInt(y_index1 + "");
            y_index2 = parseInt(y_index2 + "");
            //a,b,c,d
            const a = new THREE.Vector3(x_index1 * size, y_index1 * size, 0);
            const b = new THREE.Vector3(x_index2 * size, y_index1 * size, 0);
            const c = new THREE.Vector3(x_index2 * size, y_index2 * size, 0);
            const d = new THREE.Vector3(x_index1 * size, y_index2 * size, 0);
            const o = new THREE.Vector3(
              0.25 * (a.x + b.x + c.x + d.x),
              0.25 * (a.y + b.y + c.y + d.y),
              0.25 * (a.z + b.z + c.z + d.z),
            );

            console.log(x_index1, x_index2, y_index1, y_index2);
            console.log(a, b, c, d, o);
            const key = `a${x_index1}b${x_index2}c${y_index1}d${y_index2}`;
            console.log(key);
            if (refRegions.current[key] == null) {
              refRegions.current[key] = {
                l: size / 2,
                a,
                a_d: new THREE.Vector3(0, 0, 0), //速度
                a_d2: new THREE.Vector3(0, 0, 0), //加速度
                b,
                b_d: new THREE.Vector3(0, 0, 0), //速度
                b_d2: new THREE.Vector3(0, 0, 0), //加速度
                c,
                c_d: new THREE.Vector3(0, 0, 0), //速度
                c_d2: new THREE.Vector3(0, 0, 0), //加速度
                d,
                d_d: new THREE.Vector3(0, 0, 0), //速度
                d_d2: new THREE.Vector3(0, 0, 0), //加速度
              };
            } else {
            }

            let params = []; //各頂点のs,t

            refLineRegions.current.push([]);
            for (let ii = 0; ii < vertices.length; ii++) {
              //
              const op = new THREE.Vector3(
                vertices[ii].x,
                vertices[ii].y,
                vertices[ii].z,
              ).sub(o);
              const s = op.x / (size / 2);
              const t = op.y / (size / 2);
              //console.log(s, t);
              params.push({ s, t });
              refLineRegions.current[refLineRegions.current.length - 1].push({
                key,
                s,
                t,
              });
            }
          }
          const keys = Object.keys(refRegions.current);
          const tmpIndex = Math.floor(Math.random() * keys.length);
          console.log(tmpIndex);
          setSelectedIndex(tmpIndex);
          setIsFinishWrite(!isFinishWrite);
        }}
      >
        <planeGeometry />
        <meshBasicMaterial color="red" side={DoubleSide} />
      </mesh>
      {refLineGeometries.current.map((g, index) => {
        return (
          <line geometry={g} castShadow key={index}>
            <lineBasicMaterial
              attach="material"
              color={"#000000"}
              linewidth={1}
              linecap={"round"}
              linejoin={"round"}
            />
          </line>
        );
      })}
    </group>
  );
}

export default function Canvas_Three(props) {
  const refCanvas = useRef(null);
  useEffect(() => {
    if (refCanvas != null) {
      console.log(refCanvas.current);
    }
  }, [refCanvas]);
  return (
    <Canvas
      ref={refCanvas}
      shadows
      camera={{ position: [0, 0, 100] }}
      gl={{
        alpha: false,
        antialias: true,
        stencil: false,
        depth: true,
      }}
    >
      <color attach="background" args={["white"]} />
      <axesHelper />
      <gridHelper
        scale={20}
        rotation-x={-Math.PI / 2}
        args={[100, 100, "#c5c5c5", "#c5c5c5"]}
      />
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={false}
        enableDamping={false}
      />
      <Suspense fallback={null}></Suspense>
      <MyLine></MyLine>
    </Canvas>
  );
}
