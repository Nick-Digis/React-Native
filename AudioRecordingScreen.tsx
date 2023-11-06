import RNFetchBlob from "rn-fetch-blob";
import { useEffect, useRef, useState } from "react";
import type { RouteProp } from "@react-navigation/native";
import { Alert, StyleSheet, Text, View } from "react-native";
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import { faClockRotateLeft } from "@fortawesome/pro-duotone-svg-icons";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";

import { colors } from "~/utils/colors";
import type { RootStackParamList } from "~/types/routes";
import { useAudioRecordings } from "./hooks/useAudioRecordings";
import { ScreenHeader, IconButton, AudioRecordingsControls, PlayAudioState, RecordingState } from "~/components";

export const AudioRecordingScreen = () => {
  const navigation = useNavigation();
  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;
  const { saveNewRecording } = useAudioRecordings();
  const { params } = useRoute<RouteProp<{ params: RootStackParamList["AudioRecording"] }>>();

  const [savedFile, setSavedFile] = useState("");
  const [recordingStarted, setRecordingStarted] = useState(false);

  const onResetRecord = () => {
    setSavedFile("");
    navigation.dispatch(
      CommonActions.navigate("AudioRecording", { audioRecordingName: undefined })
    );
  };
  const onReset = () => {
    if (!params?.audioRecordingName) {
      onDiscard(onResetRecord);
    } else {
      onResetRecord();
    }
  };

  useEffect(() => {
    if (params?.audioRecordingName) {
      const recordsDir = `${RNFetchBlob.fs.dirs.DocumentDir}/audioRecords`;
      const filePath = `${recordsDir}/${params?.audioRecordingName}`;

      setSavedFile(filePath);
    }
  }, [params?.audioRecordingName]);

  const onSaveDraft = async () => {
    const audioRecordingName = await saveNewRecording(savedFile);
    navigation.dispatch(CommonActions.navigate("AudioRecording", { audioRecordingName }));
  };

  const onDiscard = (discardCb: () => void) => {
    Alert.alert("Warning", "Are you sure you want to discard the recording?", [
      {
        text: "Discard",
        onPress: discardCb
      },
      {
        text: "Cancel",
        onPress: () => {},
        style: "cancel"
      }
    ]);
  };

  const handleGoBack = () => {
    if ((savedFile && !params?.audioRecordingName) || recordingStarted) {
      onDiscard(() => navigation.goBack());
    } else {
      navigation.goBack();
    }
  };

  const formatTime = (time: number) => {
    return audioRecorderPlayer.mmssss(Math.floor(time)).split(":").splice(0, 2).join(":");
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Record audio"
        rightButton={
          <IconButton
            icon={faClockRotateLeft}
            color={colors.white}
            secondaryColor={colors.orange}
            secondaryOpacity={1}
            onPress={() => {
              navigation.dispatch(CommonActions.navigate("AudioHistory"));
            }}
          />
        }
        onBack={handleGoBack}
      />
      {params?.audioRecordingName && (
        <Text style={styles.text}>{`${params?.audioRecordingName}`}</Text>
      )}
      <View style={styles.pageContainer}>
        {!savedFile ? (
          <RecordingState
            setRecordingStarted={setRecordingStarted}
            setSavedFile={setSavedFile}
            audioPlayerRef={audioRecorderPlayer}
            formatTime={formatTime}
          />
        ) : (
          <>
            <PlayAudioState
              audioPlayerRef={audioRecorderPlayer}
              savedFile={savedFile}
              formatTime={formatTime}
            />
            <AudioRecordingsControls
              hasAudio={!!params?.audioRecordingName}
              onReset={onReset}
              onSaveDraft={onSaveDraft}
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black
  },
  pageContainer: {
    marginVertical: 30,
    flex: 1,
    justifyContent: "space-between"
  },
  text: {
    color: colors.white,
    fontFamily: "Poppins",
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center"
  }
});
