type TListItem = 'fixes' | 'features';
interface IUpdatesJson {
  date: string;
  features: {
    en: string[];
    fr: string[];
  };
  fixes: {
    en: string[];
    fr: string[];
  };
  media: {
    type: 'IMAGE' | 'VIDEO';
    url: string;
  };
}
const WhatsNewScreen: React.FC = () => {
  let MediaContent;
  const locale = useSelector((state: RootState) => state.locale.locale ?? 'fr');
  const moment = getMoment();
  const theme = useTheme();
  const videoRef = useRef<Video | null>(null);
  const dotSymbol = '\u2022';
  const uri = 'http://veraicona.hypotheses.org/files/2017/11/confused-travolta-original-pulp-fiction-animated-gif.gif';
  const imageSource = {
    uri,
    priority: FastImage.priority.high,
  };
  const onLoadVideo = () => {
    videoRef.current!.seek(0);
  };
  if (updates?.media?.url) {
    switch (updates?.media?.type) {
      case 'IMAGE':
        MediaContent = <ModalImage source={imageSource} />;
        break;
      case 'VIDEO':
        MediaContent = (
          <ModalVideo
            ref={(ref) => (videoRef.current = ref)}
            resizeMode="cover"
            controls
            paused
            source={{ uri: updates?.media?.url }}
            onLoad={onLoadVideo}
          />
        );
        break;
      default:
        break;
    }
  }
  const renderList = (type: TListItem) =>
    updates[type][locale].map((item: string, index: number) => (
      <TextStyled
        key={`${type}-${index}`}
        mb={15}
        medium
        fontSize={17}
        lineHeight={19}
        children={`${dotSymbol} ${item}`}
      />
    ));
  return (
    <ScrollableContainer showsVerticalScrollIndicator={false}>
      <TextStyled bold fontSize={24} lineHeight={34} children={updates?.text?.title?.[locale]} />
      <TextStyled mb={20} fontSize={13} lineHeight={19} children={moment(updates?.date).format('D MMMM YYYY')} />
      <MediaContainer>
        <Media children={MediaContent} />
      </MediaContainer>
      <TextStyled
        bold
        mt={20}
        mb={5}
        fontSize={24}
        lineHeight={34}
        color={theme.GREEN_TEXT}
        children={updates?.text?.feature?.[locale]}
      />
      {renderList('features')}
      <TextStyled
        bold
        mb={5}
        fontSize={24}
        lineHeight={35}
        color={theme.REVERSE_BUTTON_COLOR}
        children={updates?.text?.fixes?.[locale]}
      />
      {renderList('fixes')}
    </ScrollableContainer>
  );
};