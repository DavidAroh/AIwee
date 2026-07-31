/**
 * anim — lightweight animation primitives built on the RN Animated API.
 * No extra deps / no babel config, so they're safe across Expo Go.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";

/** Fade + rise in on mount (with optional stagger delay). */
export function FadeIn({
  children,
  delay = 0,
  from = 14,
  duration = 380,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  from?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(from)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.timing(translate, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translate, duration, delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: translate }] }]}>
      {children}
    </Animated.View>
  );
}

/** Crossfade whenever `trigger` changes (used for tab/screen switches). */
export function Crossfade({
  trigger,
  children,
  style,
}: {
  trigger: string | number;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [trigger, opacity]);
  return <Animated.View style={[{ flex: 1, opacity }, style]}>{children}</Animated.View>;
}

/** Pulsing "live" dot — expanding ring + solid core. */
export function PulseDot({ size = 8, color }: { size: number; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 2.6, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <Animated.View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
        }}
      />
      <Animated.View
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
      />
    </Animated.View>
  );
}

/** Slow continuous breathing scale — for the SOS button to draw attention. */
export function Breathe({
  children,
  style,
  min = 1,
  max = 1.06,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  min?: number;
  max?: number;
}) {
  const scale = useRef(new Animated.Value(min)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: max, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: min, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, min, max]);
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}
