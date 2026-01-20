import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SecureAuthenticatorLogoProps {
  onFinish?: () => void;
  duration?: number;
}

export default function SecureAuthenticatorLogo({
  onFinish,
  duration = 2500,
}: SecureAuthenticatorLogoProps) {
  const scale = useRef(new Animated.Value(0.90)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get("window");

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    if (onFinish) {
      const timer = setTimeout(onFinish, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onFinish]);

  return (
    <View style={styles.container}>
      <Svg
        width={width}
        height={height}
        viewBox="0 0 400 700"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          {/* Silver metallic border */}
          <LinearGradient id="silver" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="50%" stopColor="#bfc3c7" />
            <Stop offset="100%" stopColor="#8b8f94" />
          </LinearGradient>
        </Defs>

        <AnimatedG
          transform={[{ scale }]}
          opacity={opacity}
          origin="200, 280"
        >
          {/* Outer Shield */}
          <Path
            d="M200 60 L345 120 V250 C345 380 270 450 200 490 C130 450 55 380 55 250 V120 L200 60 Z"
            fill="url(#silver)"
          />

          {/* Inner Shield */}
          <Path
            d="M200 78 L325 130 V248 C325 360 265 425 200 460 C135 425 75 360 75 248 V130 L200 78 Z"
            fill="#111111"
          />

          {/* Checkmark */}
          <Path
            d="M145 260 L185 300 L265 210"
            stroke="#e6e6e6"
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </AnimatedG>

        {/* App Name */}
        <SvgText
          x="200"
          y="560"
          textAnchor="middle"
          fontSize="34"
          fontWeight="700"
          fill="#ffffff"
        >
          Krypta
        </SvgText>

        {/* Tagline */}
        <SvgText
          x="200"
          y="600"
          textAnchor="middle"
          fontSize="16"
          fill="#9a9a9a"
        >
          Your Passwords, Protected
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
});
