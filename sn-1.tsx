const Feed: FC = () => {
  const refreshing = useSelector((state: RootState) => state.app.refreshing);
  const location = useSelector((state: RootState) => state.app.coordinates);
  const navigation = useNavigation();
  const [showRefresh, setRefresh] = useState(false);
  const isRegistered = useSelector((state: RootState) => state.auth.isRegistered);
  const userId = useSelector((state: RootState) => state.app.userId);
  const isLogged = useSelector((state: RootState) => state.auth.isLogged);
  const [handleFavoritePlaceToggle] = useFavoritePlace();
  const { handleRefreshToken } = useAuthentification();
  const [fetchProfile, { data: myProfile }] = useLazyQuery(USER_PROFILE, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
    variables: { input: { location, radius: 50000000 } },
    onError: (error) => {
      CrashLogger.crashReport(error, false, ' query: [USER_PROFILE] => OnError', 'screens/Feed/index.tsx');
    },
    onCompleted: (data) => {
      CrashLogger.setNickname(data?.userProfile?.nickname);
      CrashLogger.setUserId(data?.userProfile?.id);
    },
  });

  const { data: feedData, loading: feedLoading, refetch: feedRefetch } = useQuery(FEED, {
    fetchPolicy: 'cache-and-network',
    skip: !isLogged,
    variables: { input: { location }, distance: { ...location }, sectionInput: { location } },
    notifyOnNetworkStatusChange: true,
    onError: async (error) => {
      CrashLogger.crashReport(error, false, ' query: [FEED] => OnError', 'screens/Feed/index.tsx');
      if (error.message.match('UNAUTHORIZED')) {
        await handleRefreshToken();
      }
    },
  });

  const [userPartiesRefetch, { data: userPartiesData, loading: userPartiesLoading }] = useLazyQuery(USER_PARTIES, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    variables: { input: { offset: 0, limit: 30 } },
    onError: (error) => {
      CrashLogger.crashReport(error, false, ' query: [USER_PARTIES] => OnError', 'screens/Feed/index.tsx');
    },
  });

  const navigatePartyDetails = (partyId: string, isCanceled: boolean, isOnline: boolean) => async () => {
    navigation.navigate('Party', {
      stack: EPartyStack.PARTY_DETAILS,
      screen: 'PartyDetails',
      params: { partyId, isCanceled, isOnline },
    });
  };

  const navigatePlaceDetails = (placeId: string) => async () => {
    navigation.navigate('Place', {
      screen: 'PlaceDetails',
      params: { placeId },
    });
  };

  const renderPlace = (item: IRenderPlaceProps, testID?: string) => {
    const { address, name, id, ratingScore, isFavorite, type, cover, distance } = item;
    return (
      <PlaceCardContainer>
        <PlaceCardBig
          testID={testID}
          isFavorite={isFavorite}
          gameImage={{ uri: cover?.medias?.[0].url }}
          name={name}
          type={translateType(type)}
          rating={ratingScore}
          address={parseFullAddress(address, null, false)}
          distance={formatDistance(distance)}
          onPress={navigatePlaceDetails(id)}
          handleFavoritePlaceToggle={handleFavoritePlaceToggle(item, myProfile?.userProfile)}
        />
      </PlaceCardContainer>
    );
  };

  const renderParty = (item: IRenderPartyProps, testID?: string) => {
    const {
      id,
      videoGame: { banners, name: videoGameName },
      admin: { avatar, nickname, certified },
      dateStart,
      options: { isOnline, nbSlots },
      participants,
      address,
      place,
      canceledAt,
      consoles,
    } = item;

    return (
      <GameCard
        key={id}
        gameImage={{ uri: banners?.[0].medias?.[0].url }}
        date={renderDateStart(dateStart)}
        time={renderTimeStart(dateStart)}
        game={videoGameName}
        address={!isOnline ? parseFullAddress(address, place, false) : ''}
        userAvatar={{ uri: avatar?.url }}
        nickName={nickname}
        slots={nbSlots - participants.length}
        height={290}
        width={280}
        consoles={consoles}
        isOnline={isOnline}
        onPress={navigatePartyDetails(id, canceledAt ? true : false, isOnline)}
        isPlace={place !== null}
        isCertified={certified}
      />
    );
  };

  /**
   * Generic function called to render party and place sections list
   */
  const renderList = (
    title: string,
    viewAll: boolean = true,
    data: any[],
    renderItem: (item: any, testID?: string) => JSX.Element,
    item: Section,
    testID?: string,
  ) => {
    return (
      <HeaderRow mt={30} key={title}>
        <TitleRow>
          <Title>{title}</Title>
          {viewAll && (
            <TouchableOpacity onPress={() => navigateToViewAll(item.operation, item.result.options?.videoGameId)}>
              <ViewAll>{t('Feed.view_all')}</ViewAll>
            </TouchableOpacity>
          )}
        </TitleRow>
        <HeaderRow mt={10}>
          <ScrollableList
            testID={testID ? testID : item.__typename}
            renderItem={(current, index) => renderItem(current, `${testID}-${index}`)}
            itemWidth={280}
            data={data}
            scrollDirection={'horizontal'}
            refreshing={feedLoading}
            footerComponent={<LoadingIndicator isShown={feedLoading} />}
          />
        </HeaderRow>
      </HeaderRow>
    );
  };

  const navigateGameDetails = (gameId: string) => {
    navigation.navigate('Game', {
      screen: 'GameDetails',
      params: { gameId },
    });
  };

  /**
   * Render list function called for Popular Video Games
   */
  const renderVideoGames = (title: string, data: [any]) => {
    return (
      <HeaderRow mt={30} key={title}>
        <TitleRow>
          <Title>{title}</Title>
        </TitleRow>
        <HeaderRow mt={10}>
          <ActivitiesList
            testID="Feed.PopularActivities"
            data={data}
            activityCardPress={(item) => navigateGameDetails(item.id)}
            ml
            favActivitiesCount={myProfile?.userProfile?.favoriteVideoGames?.length}
          />
        </HeaderRow>
      </HeaderRow>
    );
  };

  const navigateToViewAll = (type: OPERATION_TYPE, videoGameId?: string) => {
    navigation.navigate('FeedSectionList', { operation: type, videoGameId });
  };

  const renderSection = (item: Section) => {
    if (item.result.count === 0) return;
    switch (item.result.dataType) {
      case DATA_TYPE.PARTY:
        return renderList(item.result.name, item.result.viewAll?.visible, item.result.data, renderParty, item);
      case DATA_TYPE.PLACE:
        return renderList(
          item.result.name,
          item.result.viewAll?.visible,
          item.result.data,
          renderPlace,
          item,
          'Feed.PlacesNearYou.list',
        );
      case DATA_TYPE.VIDEO_GAME:
        return renderVideoGames(item.result.name, item.result.data);
      default:
        break;
    }
  };

  const refresh = useCallback(async () => {
    try {
      setRefresh(true);
      if (isRegistered) userPartiesRefetch();
      if (isRegistered) fetchProfile();
      if (isLogged) await feedRefetch();
      setRefresh(false);
    } catch (error) {
      setRefresh(false);
      CrashLogger.crashReport(error, false, ' query: [USER_PARTIES] => OnError', 'screens/Feed/index.tsx');
    }
  }, [feedRefetch, userPartiesRefetch, isLogged, isRegistered, fetchProfile]);

  useEffect(() => {
    if (isRegistered) userPartiesRefetch();
    if (isRegistered) fetchProfile();
  }, [userPartiesRefetch, fetchProfile, userId, isLogged, isRegistered]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogged]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshing]);

  if ((feedLoading && !feedData) || (isRegistered && userPartiesLoading && !userPartiesData)) {
    return (
      <LinearGradient colors={gradientColor}>
        <Container paddingOff style={{ backgroundColor: 'transparent' }} transparent>
          <Loader />
        </Container>
      </LinearGradient>
    );
  }
  if (!feedLoading && !feedData && !showRefresh) {
    if (isLogged) feedRefetch();
  }

  return (
    <LinearGradient colors={gradientColor}>
      <Container paddingOff style={{ backgroundColor: 'transparent' }} transparent>
        <ScrollableContainer
          testID="Feed.ScrollView"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={showRefresh} onRefresh={refresh} />}
          contentContainerStyle={{ paddingBottom: 65 }}>
          <Header testID="Feed.Title">{t('Feed.header')}</Header>
          <OfficialParties data={feedData?.feed?.campaigns} />
          <UserParties
            data={userPartiesData?.userParties?.data}
            navigatePartyDetails={navigatePartyDetails}
            isRegistered={isRegistered}
          />
          <View style={{ marginTop: -10 }}>
            {feedData?.feed?.sections?.map((item: Section) => {
              return renderSection(item);
            })}
          </View>
        </ScrollableContainer>
      </Container>
    </LinearGradient>
  );
};