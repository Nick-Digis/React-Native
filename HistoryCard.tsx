import type {FC} from "react";
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import {PanGestureHandler} from "react-native-gesture-handler";
import type {PanGestureHandlerGestureEvent, PanGestureHandlerProps} from "react-native-gesture-handler";
import {Dimensions, Pressable, StyleSheet, Text, View} from "react-native";

import {colors} from "~/utils/colors";
import {FontAwesomeIcon} from "@fortawesome/react-native-fontawesome";
import {faTrash} from "@fortawesome/pro-solid-svg-icons";

const {width: SCREEN_WIDTH} = Dimensions.get("window");

interface HistoryCardProps extends Pick<PanGestureHandlerProps, 'simultaneousHandlers'> {
  title: string,
  subTitle: string,
  preamble?: string,
  onPress: () => void
  onDelete?: () => void
}

export const HistoryCard: FC<HistoryCardProps> = ({
	title,
	subTitle,
	preamble,
	onPress,
	onDelete,
	simultaneousHandlers,
}) => {
  const x = useSharedValue(0);

  const panEvent = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onActive: (event) => {
      x.value = event.translationX;
    },
    onEnd: () => {
      const shouldBeDismissed = -x.value > SCREEN_WIDTH / 2;

      if (shouldBeDismissed) {
        x.value = withTiming(-SCREEN_WIDTH);
        runOnJS(onDelete)()
      } else {
        x.value = withTiming(0);
      }
    },
  })

  const dragItemStyle = useAnimatedStyle(() => ({
    transform: [{translateX: x.value}],
  }));

  return (
    <View>
      <FontAwesomeIcon icon={faTrash} color={colors.red} style={styles.trash}/>
      <PanGestureHandler
        simultaneousHandlers={simultaneousHandlers}
        onGestureEvent={panEvent}
        enabled={!!onDelete}
      >
        <Animated.View style={[styles.itemContainer, dragItemStyle]}>
          <Pressable onPress={onPress}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderContent}>
                <View style={styles.cardHeaderNameTimeContainer}>
                  <Text style={styles.cardHeaderTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.cardHeaderTime}>
                    {subTitle}
                  </Text>
                </View>
                {!!preamble && (
                  <Text style={styles.cardHeaderMessage} numberOfLines={3}>
                    {preamble}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  )
}


const styles = StyleSheet.create({
  itemContainer: {
    margin: 8,
    borderRadius: 16,
    backgroundColor: colors.darkGrey
  },
  // Card Header
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16
  },
  cardHeaderContent: {
    flexShrink: 1,
    flexGrow: 1
  },
  cardHeaderNameTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  cardHeaderTitle: {
    color: colors.white,
    opacity: 0.4,
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins",
    letterSpacing: 0.8,
    flexShrink: 1
  },
  cardHeaderMessage: {
    marginTop: 6,
    color: colors.white,
    fontFamily: "Poppins",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 18
  },
  cardHeaderTime: {
    color: colors.violet,
    fontFamily: "Poppins",
    fontWeight: "400",
    fontSize: 12,
    lineHeight: 14,
    marginLeft: 16
  },
  trash: {
    position: 'absolute',
    top: 25,
    right: 40,
  }
});
