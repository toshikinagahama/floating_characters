"use client";
import Image from "next/image";
import * as THREE from "three";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { useState, useEffect, Suspense, useRef } from "react";
import { CameraShake, OrbitControls } from "@react-three/drei";
import Canvas_Three from "../components/Canvas_Three";

export default function Home() {
  return (
    <main className="flex w-screen h-screen flex-col items-center justify-between select-none">
      <Canvas_Three></Canvas_Three>
    </main>
  );
}
