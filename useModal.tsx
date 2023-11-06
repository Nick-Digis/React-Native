import type { DependencyList } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { faTimes } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { colors, generateModalKey } from "~/utils";
import { ModalContext } from "~/contexts/ModalProvider";
import type { ModalType } from "~/contexts/ModalProvider";

type showModal = () => void;
type hideModal = () => void;

export const useModal = (
  Component: ModalType,
  dependencies: DependencyList = []
): [showModal, hideModal] => {
  const key = useMemo(generateModalKey, []);
  const context = useContext(ModalContext);
  const [isShown, setShown] = useState<boolean>(false);
  const showModal = useCallback(() => setShown(true), []);
  const hideModal = useCallback(() => setShown(false), []);

  const modal = useCallback(
    () => (
      <>
        <View style={styles.topRow}>
          <Pressable onPress={hideModal} hitSlop={8}>
            <FontAwesomeIcon icon={faTimes} color={colors.white} size={24} />
          </Pressable>
        </View>
        <Component />
      </>
    ),
    [Component, hideModal, dependencies]
  );

  useEffect(() => {
    if (isShown) {
      context.showModal(key, modal);
    } else {
      context.hideModal(key);
    }

    // Delete modal when parent component unmounts
    return () => context.clearModal(key);
  }, [modal, isShown, context, key]);

  return [showModal, hideModal];
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8
  }
});
