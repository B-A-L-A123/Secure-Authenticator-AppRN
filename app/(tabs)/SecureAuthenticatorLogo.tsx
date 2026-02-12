import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
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
  const scale = useRef(new Animated.Value(0.9)).current;
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
          {/* Silver metallic globe stroke */}
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
          {/* Globe Outer Circle */}
          <Circle
            cx="200"
            cy="260"
            r="120"
            stroke="url(#silver)"
            strokeWidth="8"
            fill="none"
          />

          {/* Longitude Lines */}
          <Path
            d="M200 140 C170 200 170 320 200 380
               C230 320 230 200 200 140 Z"
            stroke="#e6e6e6"
            strokeWidth="3"
            fill="none"
          />

          <Path
            d="M200 140 C140 200 140 320 200 380"
            stroke="#9a9a9a"
            strokeWidth="2"
            fill="none"
          />

          <Path
            d="M200 140 C260 200 260 320 200 380"
            stroke="#9a9a9a"
            strokeWidth="2"
            fill="none"
          />

          {/* Latitude Lines */}
          <Path
            d="M90 260 H310"
            stroke="#e6e6e6"
            strokeWidth="3"
          />

          <Path
            d="M110 220 H290"
            stroke="#9a9a9a"
            strokeWidth="2"
          />

          <Path
            d="M110 300 H290"
            stroke="#9a9a9a"
            strokeWidth="2"
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
