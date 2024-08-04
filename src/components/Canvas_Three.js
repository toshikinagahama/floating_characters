import React, { useRef, useState, useEffect, Suspense, useMemo } from "react";
import * as THREE from "three";
import { DoubleSide } from "three";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, useHelper, PointLightHelper } from "@react-three/drei";
import { useControls } from "leva";

function MyLine({ color, ...props }) {
  const SIZE = 20; //メッシュのサイズ/2
  const NUM = 10; //メッシュの1辺の頂点数
  const DT = 0.005; //積分時間
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
        const fs = refRegions.current[keys[i]].fs;
        const mesh_vs = refRegions.current[keys[i]].mesh_vs;
        const mesh_vs_d = refRegions.current[keys[i]].mesh_vs_d;
        const mesh_vs_d2 = refRegions.current[keys[i]].mesh_vs_d2;
        const springIndices = refRegions.current[keys[i]].springIndices;
        const springLengths = refRegions.current[keys[i]].springLengths;
        //各メッシュの点に物理演算
        // ma = -kx - cv + mg + f1(浮力) + f2(外力)
        // 質量
        let ms = []; //各頂点の質量
        let f1s = []; //各頂点の浮力
        let f2s = []; //各頂点の外力（風）
        for (let ii = 0; ii < mesh_vs.length; ii++) {
          ms.push(1);
          if (ii >= 12) {
            f1s.push(new THREE.Vector3(0.0, 0.0, 200));
          } else {
            f1s.push(new THREE.Vector3(0.0, 0.0, 100));
          }
          f2s.push(
            new THREE.Vector3(
              (Math.random() - 0.5) * 2000,
              (Math.random() - 0.5) * 2000,
              (Math.random() - 0.5) * 30,
            ),
          );
        }
        //減速係数
        const c_all = 10; //減速係数
        //バネ係数
        const k_all = 300; //バネ係数
        const gra = new THREE.Vector3(0, 0, -4.0);
        for (let ii = 0; ii < mesh_vs.length; ii++) {
          //各頂点の加速度を運動方程式から導く
          let f = new THREE.Vector3(0, 0, 0);
          f.add(gra.clone().multiplyScalar(ms[ii])); //重力
          f.add(mesh_vs_d[ii].clone().multiplyScalar(-c_all)); //減衰力
          f.add(f1s[ii]); //浮力
          f.add(f2s[ii]); //外力
          f.add(
            new THREE.Vector3(
              0,
              refRegions.current[keys[i]].mesh_vs[ii].z * 5,
              0,
            ),
          ); //徐々にy軸正方向へ

          ////文字をベリッと剥がしたいけどうまくいかない
          if (refRegions.current[keys[i]].mesh_vs[15].z < 5) {
            if (ii == 0) {
              //
              //console.log(refRegions.current[keys[i]].mesh_vs[0].z);
              f.add(new THREE.Vector3(0, 0, -1000));
              //console.log(f);
            }
          }

          for (let iii = 0; iii < springIndices[ii].length; iii++) {
            //バネ力
            const l = mesh_vs[springIndices[ii][iii]]
              .clone()
              .sub(mesh_vs[ii])
              .normalize()
              .multiplyScalar(
                mesh_vs[ii].distanceTo(mesh_vs[springIndices[ii][iii]]) -
                  springLengths[ii][iii],
              );
            f.add(l.clone().multiplyScalar(k_all));
          }
          refRegions.current[keys[i]].mesh_vs_d2[ii] = f
            .clone()
            .multiplyScalar(1.0 / ms[ii]);
          refRegions.current[keys[i]].mesh_vs_d[ii].add(
            refRegions.current[keys[i]].mesh_vs_d2[ii]
              .clone()
              .multiplyScalar(DT),
          );
          refRegions.current[keys[i]].mesh_vs[ii].add(
            refRegions.current[keys[i]].mesh_vs_d[ii]
              .clone()
              .multiplyScalar(DT),
          );
          //if (refRegions.current[keys[i]].mesh_vs[ii].z < -0.1) {
          //  refRegions.current[keys[i]].mesh_vs[ii].z = 0;
          //  refRegions.current[keys[i]].mesh_vs_d[ii].z = 0;
          //  refRegions.current[keys[i]].mesh_vs_d2[ii].z = 0;
          //}
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
          const fs = refRegions.current[key].fs;
          const mesh_vs = refRegions.current[key].mesh_vs;
          for (let ii = 0; ii < vertices.length; ii++) {
            if (refLineRegions.current[i][ii] == null) continue;
            const targetIndex = refLineRegions.current[i][ii].targetIndex;
            const a = mesh_vs[fs[targetIndex][0]];
            const b = mesh_vs[fs[targetIndex][1]];
            const c = mesh_vs[fs[targetIndex][2]];
            const d = mesh_vs[fs[targetIndex][3]];
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
                  (1.0 + s) * (1.0 + t) * od.x +
                  (1.0 - s) * (1.0 + t) * oc.x);
            vertices[ii].y =
              oNew.y +
              0.25 *
                ((1.0 - s) * (1.0 - t) * oa.y +
                  (1.0 + s) * (1.0 - t) * ob.y +
                  (1.0 + s) * (1.0 + t) * od.y +
                  (1.0 - s) * (1.0 + t) * oc.y);
            vertices[ii].z =
              oNew.z +
              0.25 *
                ((1.0 - s) * (1.0 - t) * oa.z +
                  (1.0 + s) * (1.0 - t) * ob.z +
                  (1.0 + s) * (1.0 + t) * od.z +
                  (1.0 - s) * (1.0 + t) * oc.z);
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
            let x_index1 = Math.floor(center[0] / SIZE);
            let x_index2 = Math.ceil(center[0] / SIZE);
            let y_index1 = Math.floor(center[1] / SIZE);
            let y_index2 = Math.ceil(center[1] / SIZE);
            x_index1 = parseInt(x_index1 + "");
            x_index2 = parseInt(x_index2 + "");
            y_index1 = parseInt(y_index1 + "");
            y_index2 = parseInt(y_index2 + "");
            //左端の(x,y) = (x_index1 * SIZE, y_index1 * SIZE)
            //左下から頂点を生成していく
            let mesh_vs = [];
            const OFFSET = new THREE.Vector3(
              x_index1 * SIZE,
              y_index1 * SIZE,
              0,
            );
            const DIV = (SIZE * 2) / (NUM - 1);
            for (let i = 0; i < NUM; i++) {
              for (let j = 0; j < NUM; j++) {
                mesh_vs.push(
                  new THREE.Vector3(
                    OFFSET.x + j * DIV,
                    OFFSET.y + i * DIV,
                    OFFSET.z,
                  ),
                );
              }
            }
            console.log(mesh_vs);
            //face indexを計算
            let fs = [];
            for (let i = 0; i < NUM - 1; i++) {
              for (let j = 0; j < NUM - 1; j++) {
                const a_i = parseInt(j + 0 + (i + 0) * NUM + "");
                const b_i = parseInt(j + 1 + (i + 0) * NUM + "");
                const c_i = parseInt(j + 0 + (i + 1) * NUM + "");
                const d_i = parseInt(j + 1 + (i + 1) * NUM + "");
                fs.push([a_i, b_i, c_i, d_i]);
              }
            }
            console.log(fs);
            //各頂点のバネの対インデックスを算出
            //
            let springIndices = [];
            for (let i = 0; i < mesh_vs.length; i++) {
              springIndices.push([]);
            }
            for (let i = 0; i < springIndices.length; i++) {
              //
              for (let j = 0; j < fs.length; j++) {
                for (let jj = 0; jj < fs[j].length; jj++) {
                  //各子メッシュのインデックス

                  if (fs[j].indexOf(i) !== -1) {
                    //各面のインデックスの中に対象インデックスがあったら
                    if (fs[j][jj] == i) {
                      //そのバネだったら飛ばす
                      continue;
                    } else {
                      //それ以外のバネで、springIndicesの中に存在しなかったら追加
                      if (springIndices[i].indexOf(fs[j][jj]) === -1) {
                        springIndices[i].push(fs[j][jj]);
                      }
                    }
                  }
                }
              }
            }
            //初期バネ長
            let springLengths = [];
            for (let i = 0; i < springIndices.length; i++) {
              springLengths.push([]);
              const a = mesh_vs[i];
              for (let ii = 0; ii < springIndices[i].length; ii++) {
                const b = mesh_vs[springIndices[i][ii]];
                springLengths[i].push(b.distanceTo(a));
              }
            }
            console.log(springLengths);

            //左下：0、右下：NUM-1、左上：NUM*(NUM-1)、右上：NUM*NUM-1
            const o = new THREE.Vector3(
              0.25 *
                (mesh_vs[0].x +
                  mesh_vs[NUM - 1].x +
                  mesh_vs[NUM * (NUM - 1)].x +
                  mesh_vs[NUM * NUM - 1].x),
              0.25 *
                (mesh_vs[0].y +
                  mesh_vs[NUM - 1].y +
                  mesh_vs[NUM * (NUM - 1)].y +
                  mesh_vs[NUM * NUM - 1].y),
              0.25 *
                (mesh_vs[0].z +
                  mesh_vs[NUM - 1].z +
                  mesh_vs[NUM * (NUM - 1)].z +
                  mesh_vs[NUM * NUM - 1].z),
            );

            console.log(x_index1, x_index2, y_index1, y_index2);
            console.log(o);
            const key = `a${x_index1}b${x_index2}c${y_index1}d${y_index2}`;
            console.log(key);
            if (refRegions.current[key] == null) {
              let mesh_vs_d = []; //速度
              let mesh_vs_d2 = []; //加速度
              for (let i = 0; i < mesh_vs.length; i++) {
                mesh_vs_d.push(new THREE.Vector3(0, 0, 0));
                mesh_vs_d2.push(new THREE.Vector3(0, 0, 0));
              }
              refRegions.current[key] = {
                fs,
                mesh_vs,
                mesh_vs_d,
                mesh_vs_d2,
                springIndices,
                springLengths,
              };
            } else {
              //すでに定義されている場合は何もしない
            }

            refLineRegions.current.push([]);
            for (let ii = 0; ii < vertices.length; ii++) {
              const p = vertices[ii];
              let targetIndex = -1;
              let distances = [];
              for (let iii = 0; iii < fs.length; iii++) {
                const a = mesh_vs[fs[iii][0]];
                const b = mesh_vs[fs[iii][1]];
                const c = mesh_vs[fs[iii][2]];
                const d = mesh_vs[fs[iii][3]];
                const ap = new THREE.Vector3(p.x - a.x, p.y - a.y, 0);
                const bp = new THREE.Vector3(p.x - b.x, p.y - b.y, 0);
                const dp = new THREE.Vector3(p.x - d.x, p.y - d.y, 0);
                const ac = new THREE.Vector3(c.x - a.x, c.y - a.y, 0);
                const ab = new THREE.Vector3(b.x - a.x, b.y - a.y, 0);
                const bd = new THREE.Vector3(d.x - b.x, d.y - b.y, 0);
                const dc = new THREE.Vector3(c.x - d.x, c.y - d.y, 0);
                const center = new THREE.Vector3(
                  (b.x + a.x) / 2,
                  (c.y + a.y) / 2,
                  0,
                );
                distances.push(
                  Math.sqrt(
                    (center.x - p.x) * (center.x - p.x) +
                      (center.y - p.y) * (center.y - p.y),
                  ),
                );

                const cross_z1 = ap.x * ac.y - ap.y * ac.x;
                const cross_z2 = ab.x * ap.y - ab.y * ap.x;
                const cross_z3 = bd.x * bp.y - bd.y * bp.x;
                const cross_z4 = dc.x * dp.y - dc.y * dp.x;

                if (
                  (cross_z1 > 0) &
                  (cross_z2 > 0) &
                  (cross_z3 > 0) &
                  (cross_z4 > 0)
                )
                  targetIndex = iii;
              }
              if (targetIndex == -1) {
                //どこにも属さない場合（はみ出た場合）
                //一番近い面に属する
                const index = distances.indexOf(Math.min(...distances));
                targetIndex = index;
              }
              const f = fs[targetIndex];
              //面に対してのs, tを求める
              const center = new THREE.Vector3(0, 0, 0);
              for (let iii = 0; iii < 4; iii++) {
                center.x += mesh_vs[f[iii]].x;
                center.y += mesh_vs[f[iii]].y;
                center.z += mesh_vs[f[iii]].z;
              }
              center.x = center.x / 4;
              center.y = center.y / 4;
              center.z = center.z / 4;
              //面が-1から1になるように、s,tを計算
              const s = (p.x - center.x) / (SIZE / (NUM - 1));
              const t = (p.y - center.y) / (SIZE / (NUM - 1));
              refLineRegions.current[refLineRegions.current.length - 1].push({
                key, //どこのメッシュか
                targetIndex, //メッシュの何番目の面か
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
