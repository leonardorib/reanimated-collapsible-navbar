import * as React from 'react';
import {
  View,
  StyleSheet,
  Text,
  Button,
  Platform,
  StatusBar,
  StatusBarStyle,
  RefreshControl,
} from 'react-native';
import Animated, {
  event,
  Value,
  diffClamp,
  multiply,
  interpolateNode,
  max,
  cond,
  set,
  add,
  startClock,
  clockRunning,
  stopClock,
  Clock,
  sub,
  lessThan,
  spring,
  neq,
  eq,
  Extrapolate,
} from 'react-native-reanimated';

const DRAG_END_INITIAL = 10000000;
const STATUS_BAR_HEIGHT = Platform.select({ ios: 20, android: 24 });
const NAV_BAR_HEIGHT = Platform.select({ ios: 64, android: 56 });

function runSpring({
  clock,
  from,
  velocity,
  toValue,
  scrollEndDragVelocity,
  snapOffset,
  diffClampNode,
}) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };

  const config = {
    damping: 1,
    mass: 1,
    stiffness: 50,
    overshootClamping: true,
    restSpeedThreshold: 0.001,
    restDisplacementThreshold: 0.001,
    toValue: new Value(0),
  };

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, from),
      set(config.toValue, toValue),
      startClock(clock),
    ]),
    spring(clock, state, config),
    cond(state.finished, [
      set(scrollEndDragVelocity, DRAG_END_INITIAL),
      set(
        snapOffset,
        cond(
          eq(toValue, 0),
          // SnapOffset acts as an accumulator.
          // We need to keep track of the previous offsets applied.
          add(snapOffset, multiply(diffClampNode, -1)),
          add(snapOffset, sub(NAV_BAR_HEIGHT, diffClampNode)),
        ),
      ),
      stopClock(clock),
    ]),
    state.position,
  ];
}
const wait = (timeout) => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};
const CollapsibleNavBar = () => {
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(() => {
    console.log('onRefresh');
    setRefreshing(true);
    wait(2000).then(() => setRefreshing(false));
  }, []);

  const scrollY = React.useRef(new Value<number>(0));
  const scrollEndDragVelocity = React.useRef(
    new Value<number>(DRAG_END_INITIAL),
  );
  const snapOffset = new Value<number>(0);

  const diffClampNode = diffClamp(
    add(
      max(scrollY.current, 0), // Handles pull down to refresh on iOS, due to bounce
      snapOffset,
    ),
    0,
    NAV_BAR_HEIGHT,
  );
  const inverseDiffClampNode = multiply(diffClampNode, -1);

  const clock = new Clock();

  const snapPoint = cond(
    lessThan(diffClampNode, NAV_BAR_HEIGHT / 2),
    0,
    -NAV_BAR_HEIGHT,
  );

  const animatedNavBarTranslateY = cond(
    // Condition to detect if we stopped scrolling
    neq(scrollEndDragVelocity.current, DRAG_END_INITIAL),
    runSpring({
      clock: clock,
      from: inverseDiffClampNode,
      velocity: 0,
      toValue: snapPoint,
      scrollEndDragVelocity: scrollEndDragVelocity.current,
      snapOffset: snapOffset,
      diffClampNode: diffClampNode,
    }),
    inverseDiffClampNode,
  );

  const animatedTitleOpacity = interpolateNode(animatedNavBarTranslateY, {
    inputRange: [-NAV_BAR_HEIGHT, 0],
    outputRange: [0, 1],
    extrapolate: Extrapolate.CLAMP,
  });

  const blockJS = () => {
    let start = Date.now();
    let end = Date.now();
    while (end - start < 20000) {
      end = Date.now();
    }
  };

  const barStyle = Platform.select<StatusBarStyle>({
    ios: 'dark-content',
    default: 'light-content',
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#C2185B" barStyle={barStyle} />
      <Animated.ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={NAV_BAR_HEIGHT}
          />
        }
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        scrollEventThrottle={1}
        onScroll={event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  y: scrollY.current,
                },
              },
            },
          ],
          { useNativeDriver: true },
        )}
        onScrollEndDrag={event(
          [
            {
              nativeEvent: {
                velocity: {
                  y: scrollEndDragVelocity.current,
                },
              },
            },
          ],
          { useNativeDriver: true },
        )}
      >
        {Array.from({ length: 60 }).map((_, i) => (
          <View key={i} style={styles.row}>
            <Text>{i}</Text>
          </View>
        ))}
        <Button title="Block JS" onPress={blockJS} />
      </Animated.ScrollView>
      <Animated.View
        style={[
          styles.navBar,
          {
            marginTop: animatedNavBarTranslateY,
          },
        ]}
      >
        <Animated.Text
          style={[styles.navBarTitle, { opacity: animatedTitleOpacity }]}
        >
          Navigation Bar
        </Animated.Text>
      </Animated.View>
    </View>
  );
};

export default CollapsibleNavBar;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? STATUS_BAR_HEIGHT : 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E91E63',
    borderBottomColor: '#dedede',
    borderBottomWidth: 1,
    height: NAV_BAR_HEIGHT,
    zIndex: 2,
  },
  navBarTitle: {
    color: 'white',
    fontSize: 20,
  },
  row: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    marginTop: Platform.OS === 'ios' ? STATUS_BAR_HEIGHT : 0,
    backgroundColor: '#EEEEEE',
  },
  scrollViewContent: {
    paddingTop: NAV_BAR_HEIGHT,
  },
});
