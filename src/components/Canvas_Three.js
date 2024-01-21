import React, { useRef, useState, useEffect, Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function MyLine({ color, ...props }) {
  const ref = useRef();
  const [points, setPoints] = useState([]);
  const [lineGeometry, setLineGeometry] = useState(null);

  useFrame((state, delta, frame) => {
    //ref.current.position.y += (Math.random() - 0.5) * 2;
    let tmpPoints = [...points];
    tmpPoints.push(
      new THREE.Vector3(Math.random() * 3, Math.random() * 2, Math.random() * 2)
    );
    setPoints(tmpPoints);
    setLineGeometry(new THREE.BufferGeometry().setFromPoints(points));
  });
  return (
    <group ref={ref} position={[0, 0, 0]}>
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          attach="material"
          color={"#9c88ff"}
          linewidth={20}
          linecap={"round"}
          linejoin={"round"}
        />
      </line>
    </group>
  );
}

export default function Canvas_Three(props) {
  return (
    <Canvas
      colorManagement
      camera={{ position: [0, 10, 20] }}
      gl={{
        alpha: false,
        antialias: false,
        stencil: false,
        depth: false,
      }}
    >
      <color attach="background" args={["gray"]} />
      <ambientLight />
      <pointLight color="white" intensity={5} position={[10, 10, 10]} />
      <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      <Suspense fallback={null}></Suspense>
      <MyLine></MyLine>
    </Canvas>
  );
}
