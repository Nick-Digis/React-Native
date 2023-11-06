const SignModal = () => {
  const [isSignUp, toggleSignUp] = useState(true);

  const dispatch = useDispatch();
  const { navigate } = useNavigation();
  const { getItem: getFirebaseToken } = useAsyncStorage(FIREBASE_TOKEN);
  const [providerLoading, setProviderLoading] = useState<boolean>(false);
  const [currentProvider, setCurrentProvider] = useState<PROVIDER>(PROVIDER.NULL);
  const [sendFeedback] = useMutation(SEND_FEEDBACK);
  const { handleRegisterWithProvider, handleLoginWithProvider } = useAuthentification();

  const title = isSignUp ? t('Auth.sign_up.title') : t('Auth.sign_in.title');
  const description = isSignUp ? t('Auth.sign_up.description') : t('Auth.sign_in.description');
  const emailText = isSignUp ? t('Auth.sign_up.with_email') : t('Auth.sign_in.with_email');
  const fbText = isSignUp ? t('Auth.sign_up.with_fb') : t('Auth.sign_in.with_fb');
  const googleText = isSignUp ? t('Auth.sign_up.with_google') : t('Auth.sign_in.with_google');
  const footer = isSignUp ? t('Auth.sign_up.footer_text') : t('Auth.sign_in.footer_text');
  const appleText = isSignUp ? t('Auth.sign_up.with_apple') : t('Auth.sign_in.with_apple');
  const hasAccount = isSignUp ? t('Auth.sign_up.has_an_account') : t('Auth.sign_in.has_an_account');
  const togglerText = isSignUp ? t('Auth.sign_up.toggler_text') : t('Auth.sign_in.toggler_text');

  const signUp = async (data: any) => {
    try {
      const { birthDate, email } = data;
      dispatch(setEmail(email));
      try {
        await handleLoginWithProvider(data);
        setProviderLoading(false);
      } catch (error) {
        CrashLogger.info(`Error catch on signUp: ${error}`);
        // if birthDate exist, register user
        if (birthDate) {
          await handleRegisterWithProvider(data, birthDate);
          navigateTo(EAuthStack.WITH_SOCIAL_WITH_BIRTHDATE, data, true);
        }
        // No birthdate then redirect user to pick one
        if (!birthDate) navigateTo(EAuthStack.WITH_SOCIAL_WITHOUT_BIRTHDATE, data, true);
        setProviderLoading(false);
      }
    } catch (error) {
      setProviderLoading(false);
      console.log('signUp main catch -> error', error);
      if (error.message === 'GraphQL error: IDENTIFIER_ALREADY_TAKEN') {
        AlertHelper.show('error', 'Error', t('Auth.sign_up.Errors.identifier_already_taken'));
      } else {
        CrashLogger.crashReport(error, false, signUp.name, 'screens/SignModal/index.tsx');
      }
    }
  };

  // build request to FACEBOOK API
  const getInfoFromToken = (token: string) => {
    const PROFILE_REQUEST_PARAMS = {
      fields: {
        string: 'id,email,birthday,token_for_business',
      },
    };

    return new Promise((resolve, reject) => {
      const profileRequest = new GraphRequest(
        '/me',
        { token, parameters: PROFILE_REQUEST_PARAMS },
        (error: Error, user: IFacebookUser) => {
          if (error) {
            console.log(error);
            reject();
          } else {
            const { email, birthday: birthDate } = user;
            // normalize result
            const normalizedUser = { email, userToken: token, provider: 'FACEBOOK', birthDate };
            resolve(normalizedUser);
          }
        },
      );
      new GraphRequestManager().addRequest(profileRequest).start();
    });
  };

  // get user info
  const facebookGetUserInfo = async () => {
    try {
      setCurrentProvider(PROVIDER.FACEBOOK);
      const login = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (login.isCancelled) {
        throw new Error('Login canceled');
      } else {
        // get access token
        const data = await AccessToken.getCurrentAccessToken();
        const accessToken = data.accessToken.toString();
        // return result
        return getInfoFromToken(accessToken);
      }
    } catch (error) {
      switch (error.message) {
        case 'Login canceled': {
          console.log(error);
          return PROVIDER_ERROR.SIGN_IN_CANCELLED;
        }
        default: {
          CrashLogger.crashReport(error, true, facebookGetUserInfo.name, 'screens/SignModal/index.tsx');
          return PROVIDER_ERROR.UNKNOWN;
        }
      }
    }
  };

  // get user info
  const googleGetUserInfo = async () => {
    try {
      setCurrentProvider(PROVIDER.GOOGLE);
      // check PlayServices
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const {
        idToken: userToken,
        user: { email, birthday: birthDate },
      } = userInfo;

      // normalize result
      const normalizedUser = {
        userToken,
        email,
        birthDate,
        provider: 'GOOGLE',
      };

      // return result
      return normalizedUser;
    } catch (error) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED: {
          return PROVIDER_ERROR.SIGN_IN_CANCELLED;
        }
        case error.code === statusCodes.IN_PROGRESS: {
          // operation (e.g. sign in) is in progress already
          return PROVIDER_ERROR.ALREADY_IN_PROGRESS;
        }
        case error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE: {
          // play services not available or outdated
          return PROVIDER_ERROR.PLAY_SERVICES_NOT_AVAILABLE;
        }
        default: {
          CrashLogger.crashReport(error, true, googleGetUserInfo.name, 'screens/SignModal/index.tsx');
          return PROVIDER_ERROR.UNKNOWN;
        }
      }
    }
  };

  const signIn = async (data: any) => {
    try {
      await handleLoginWithProvider(data);
      setProviderLoading(false);
    } catch (error) {
      CrashLogger.crashReport(error, true, signIn.name, 'screens/SignModal/index.tsx');
      setProviderLoading(false);
    }
  };

  const checkProviderErrors = async (providerData: any) => {
    switch (providerData) {
      case PROVIDER_ERROR.SIGN_IN_CANCELLED:
        return 1;
      case PROVIDER_ERROR.ALREADY_IN_PROGRESS:
        return 1;
      case PROVIDER_ERROR.PLAY_SERVICES_NOT_AVAILABLE:
        navigate('RootModal', {
          title: t('Auth.sign_up.Errors.play_service_not_available.title'),
          message: t('Auth.sign_up.Errors.play_service_not_available.message'),
          acceptText: t('Auth.sign_up.Errors.play_service_not_available.accept'),
          handleAccept: () => {},
          backgroundDark: true,
        });
        return 1;
      case PROVIDER_ERROR.UNKNOWN:
        return 1;
      default:
        return 0;
    }
  };

  const signWith = (getUserInfo: any) => async () => {
    try {
      if (providerLoading) return;
      setProviderLoading(true);
      // execute getUserInfo func depending on the social network type(Google/Facebook)
      const userInfo = await getUserInfo();
      // check for error in userInfo coming from provider
      if ((await checkProviderErrors(userInfo)) === 1) {
        setProviderLoading(false);
        return;
      }
      const deviceId = sha1(DeviceInfo.getUniqueId());
      const fcmToken = await getFirebaseToken();
      const data = { ...userInfo, deviceId, fcmToken };

      if (isSignUp) signUp(data);
      if (!isSignUp) signIn(data);
    } catch (error) {
      CrashLogger.crashReport(error, true, signWith.name, 'screens/SignModal/index.tsx');
    }
  };

  const handleToggle = (): void => {
    toggleSignUp(!isSignUp);
  };

  // email btn press handler
  const handlePress = () => {
    if (providerLoading) return;
    navigateTo();
  };

  const navigateTo = (stack = EAuthStack.WITH_EMAIL, data?, isWithSocial = false) => {
    const route = isSignUp ? 'SignUp' : 'SignIn';
    const params = isSignUp ? { stack, isWithSocial, screen: 'BirthDay', params: { data } } : {};

    // if route === signUp and birthDate DOES NOT exist,
    // pass data and navigate to SignUp screen with WITH_SOCIAL_WITHOUT_BIRTHDATE stack
    // else navigate to route with picked stack
    navigate(route, { ...params });
  };

  const decryptAppleEmail = (jwt: string | null) => {
    if (!jwt) {
      return null;
    }
    const parts = jwt.split('.');

    try {
      const u = JSON.parse(Buffer.from(parts[1], 'base64').toString('ascii'));

      return u.email;
    } catch (error) {
      CrashLogger.crashReport(error, true, decryptAppleEmail.name, 'screens/SignModal/index.tsx');
      return null;
    }
  };

  async function appleGetUserInfo() {
    try {
      setCurrentProvider(PROVIDER.APPLE);

      // performs login request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: AppleAuthRequestOperation.LOGOUT,
        requestedScopes: [AppleAuthRequestScope.EMAIL],
      });
      // get current authentication state for user
      // /!\ This method must be tested on a real device. On the iOS simulator it always throws an error.
      const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);

      // use credentialState response to ensure the user is authenticated
      if (credentialState === AppleAuthCredentialState.AUTHORIZED) {
        // user is authenticated
        const { identityToken: userToken } = appleAuthRequestResponse;
        let { email } = appleAuthRequestResponse;

        if (!email) {
          email = decryptAppleEmail(userToken);
        }
        if (!email) {
          AlertHelper.show('error', t('common.error'), t('Auth.sign_up.Errors.error_third_part'));
        }

        // normalize result
        const normalizedUser = {
          userToken,
          email,
          birthDate: undefined,
          provider: 'APPLE',
        };
        // return result
        return normalizedUser;
      }
    } catch (error) {
      switch (error.code) {
        // case '1000':
        //   break;
        default:
          CrashLogger.crashReport(error, true, appleGetUserInfo.name, 'screens/SignModal/index.tsx');
          return PROVIDER_ERROR.UNKNOWN;
      }
    }
  }

  const isProviderLoading = (provider: PROVIDER) => {
    return currentProvider === provider && providerLoading;
  };

  return (
    <BottomModal height={85}>
      <TextStyled mb={10} bold textAlign={'center'} fontSize={20} lineHeight={30} children={title} />
      <TextStyled pr={14} pl={14} mt={10} textAlign={'center'} fontSize={13} lineHeight={15} children={description} />
      <ButtonSection>
        <SignWithEmail onPress={handlePress} text={emailText} testID="AuthModal.Sign" />
        <SignWithFacebook
          onPress={signWith(facebookGetUserInfo)}
          text={fbText}
          loading={isProviderLoading(PROVIDER.FACEBOOK)}
        />
        <SignWithGoogle
          onPress={signWith(googleGetUserInfo)}
          text={googleText}
          loading={isProviderLoading(PROVIDER.GOOGLE)}
        />
        {Platform.OS === 'ios' && (
          <SignWithApple
            onPress={signWith(appleGetUserInfo)}
            text={appleText}
            loading={isProviderLoading(PROVIDER.APPLE)}
          />
        )}
      </ButtonSection>
      <ToggleSection>
        <TextStyled bold fontSize={17} lineHeight={25} mt={15} children={hasAccount} />
        <ToggleSign handleToggle={handleToggle} text={togglerText} />
      </ToggleSection>
      <ConditionSection>
        <TextStyled
          pl={30}
          pr={30}
          mb={5}
          textAlign={'center'}
          fontSize={13}
          lineHeight={19}
          opacity={0.5}
          children={footer}
        />
      </ConditionSection>
    </BottomModal>
  );
};