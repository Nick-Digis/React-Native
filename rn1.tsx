interface INavigationParams {
  userId: string;
}
const Followers = () => {
  const { push, setOptions } = useNavigation();
  const route: RouteProp<Record<string, INavigationParams | undefined>, string> = useRoute();
  const [text, setText] = useState('');
  useEffect(() => {
    setOptions({
      headerTitle: (
        <TextStyled fontSize={20} lineHeight={24} textAlign={'center'}>
          {t('Profile.Info.followers')}
        </TextStyled>
      ),
    });
  }, [setOptions]);
  const { data: followersData, loading: followersLoading, fetchMore } = useQuery(SEARCH_FOLLOWERS, {
    fetchPolicy: 'network-only',
    variables: { input: { offset: 0, limit: 10, search: text, userId: route?.params?.userId } },
    onError(error) {
      CrashLogger.crashReport(error, false, 'query: [SEARCH_FOLLOWERS] => onError', 'screens/Followers/index.tsx');
    },
  });
  const fetchMoreFollower = async () => {
    const dataLength = followersData?.searchFollower?.data?.length;
    const count = followersData?.searchFollower?.count;
    if (followersLoading || dataLength === count) return null;
    try {
      fetchMore({
        variables: {
          input: {
            offset: followersData?.searchFollower?.data.length,
            limit: 10,
            search: text,
            userId: route?.params?.userId,
          },
        },
        updateQuery: (prev: any, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            searchFollower: {
              ...followersData.searchFollower,
              count: followersData?.searchFollower?.count,
              data: [...followersData.searchFollower.data, ...fetchMoreResult.searchFollower.data],
            },
          };
        },
      });
    } catch (error) {
      CrashLogger.crashReport(error, false, fetchMoreFollower.name, 'screens/Followers/index.tsx');
    }
  };
  const handleChange = (value: string) => {
    setText(value);
  };
  const handleChangeDebounced = _.debounce(handleChange, 200);
  const handlePressUser = (userId: string) => () => {
    push(NAVIGATION_NAMES.OTHER_PROFILE, { userId });
  };
  const renderFollowingItem = ({ item }) => {
    return (
      <FollowersItem>
        <UserInfo onPress={handlePressUser(item?.id)}>
          <UserAvatarOverlay children={<UserAvatar source={{ uri: item?.avatar?.url }} />} />
          <TextStyled bold ml={10} fontSize={17} lineHeight={24} children={item?.nickname} />
          <UserCertifiedBadge isShown={item?.certified} />
          <TextStyled
            isVisible={item?.isFriend}
            ml={10}
            fontSize={13}
            lineHeight={19}
            color={COLORS.SECONDARY_TEXT}
            children={t('Profile.Followers.friends')}
          />
        </UserInfo>
        <FollowButton isMe={item?.isMe} userId={item?.id} following={item?.following} />
      </FollowersItem>
    );
  };
  const renderFollowersList = () => {
    return (
      <FlatList
        ListHeaderComponent={followersLoading ? <ActivityIndicator /> : null}
        data={followersData?.searchFollower?.data}
        renderItem={renderFollowingItem}
        keyExtractor={(a, i) => `following-${i}`}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={1}
        onEndReached={fetchMoreFollower}
      />
    );
  };
  return (
    <Container>
      <TextFieldContainer>
        <TextField
          onChangeText={handleChangeDebounced}
          textAlignVertical={'center'}
          placeholder={t('Profile.Followers.placeholder')}
          placeholderTextColor={COLORS.PLACEHOLDER_TEXT}
        />
        <SearchIcon />
      </TextFieldContainer>
      {renderFollowersList()}
    </Container>
  );
};