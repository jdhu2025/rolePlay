'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getAuthClient } from '@/core/auth/client';
import { envConfigs } from '@/config';
import { User, UserCredits } from '@/shared/models/user';

export interface ContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  isCheckSign: boolean;
  setIsCheckSign: (isCheckSign: boolean) => void;
  isShowSignModal: boolean;
  setIsShowSignModal: (show: boolean) => void;
  isShowPaymentModal: boolean;
  setIsShowPaymentModal: (show: boolean) => void;
  configs: Record<string, string>;
  fetchConfigs: () => Promise<void>;
  fetchUserCredits: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
  showOneTap: (configs: Record<string, string>) => Promise<void>;
}

const AppContext = createContext({} as ContextValue);

export const useAppContext = () => useContext(AppContext);

const CONFIG_CACHE_TTL_MS = 5 * 60_000;
const USER_INFO_CACHE_TTL_MS = 30_000;
const USER_CREDITS_CACHE_TTL_MS = 15_000;

let cachedConfigs: { data: Record<string, string>; expiresAt: number } | null =
  null;
let configsRequest: Promise<Record<string, string>> | null = null;
let cachedUserInfo: { data: User; expiresAt: number } | null = null;
let userInfoRequest: Promise<User> | null = null;
let cachedUserCredits: { data: UserCredits; expiresAt: number } | null = null;
let userCreditsRequest: Promise<UserCredits> | null = null;

async function readJsonEnvelope<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`fetch failed with status: ${response.status}`);
  }

  const { code, message, data } = await response.json();
  if (code !== 0) {
    throw new Error(message);
  }

  return data as T;
}

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [configs, setConfigs] = useState<Record<string, string>>({});

  // sign user
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);

  // is check sign (true during SSR and initial render to avoid hydration mismatch when auth is enabled)
  const [isCheckSign, setIsCheckSign] = useState(!!envConfigs.auth_secret);

  // show sign modal
  const [isShowSignModal, setIsShowSignModal] = useState(false);

  // show payment modal
  const [isShowPaymentModal, setIsShowPaymentModal] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const now = Date.now();
      if (cachedConfigs && cachedConfigs.expiresAt > now) {
        setConfigs(cachedConfigs.data);
        return;
      }

      if (!configsRequest) {
        configsRequest = fetch('/api/config/get-configs', {
          method: 'POST',
        })
          .then((resp) => readJsonEnvelope<Record<string, string>>(resp))
          .then((data) => {
            cachedConfigs = {
              data,
              expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
            };
            return data;
          })
          .finally(() => {
            configsRequest = null;
          });
      }

      const data = await configsRequest;
      setConfigs(data);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch configs failed:', e);
      }
    }
  }, []);

  const fetchUserCredits = useCallback(async () => {
    try {
      if (!userRef.current) {
        return;
      }

      const now = Date.now();
      if (cachedUserCredits && cachedUserCredits.expiresAt > now) {
        setUser((prev) =>
          prev ? { ...prev, credits: cachedUserCredits!.data as any } : prev
        );
        return;
      }

      if (!userCreditsRequest) {
        userCreditsRequest = fetch('/api/user/get-user-credits', {
          method: 'POST',
        })
          .then((resp) => readJsonEnvelope<UserCredits>(resp))
          .then((data) => {
            cachedUserCredits = {
              data,
              expiresAt: Date.now() + USER_CREDITS_CACHE_TTL_MS,
            };
            return data;
          })
          .finally(() => {
            userCreditsRequest = null;
          });
      }

      const data = await userCreditsRequest;
      setUser((prev) => (prev ? { ...prev, credits: data } : prev));
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch user credits failed:', e);
      }
    }
  }, []);

  const fetchUserInfo = useCallback(async () => {
    try {
      const now = Date.now();
      if (cachedUserInfo && cachedUserInfo.expiresAt > now) {
        setUser(cachedUserInfo.data);
        return;
      }

      if (!userInfoRequest) {
        userInfoRequest = fetch('/api/user/get-user-info', {
          method: 'POST',
        })
          .then((resp) => readJsonEnvelope<User>(resp))
          .then((data) => {
            cachedUserInfo = {
              data,
              expiresAt: Date.now() + USER_INFO_CACHE_TTL_MS,
            };
            return data;
          })
          .finally(() => {
            userInfoRequest = null;
          });
      }

      const data = await userInfoRequest;
      setUser(data);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch user info failed:', e);
      }
    }
  }, []);

  const showOneTap = useCallback(async (configs: Record<string, string>) => {
    try {
      const authClient = getAuthClient(configs);
      await authClient.oneTap({
        callbackURL: '/',
        onPromptNotification: (notification: any) => {
          // Handle prompt dismissal silently
          // This callback is triggered when the prompt is dismissed or skipped
          if (process.env.NODE_ENV !== 'production') {
            console.log('One Tap prompt notification:', notification);
          }
        },
        // fetchOptions: {
        //   onSuccess: () => {
        //     router.push('/');
        //   },
        // },
      });
    } catch (error) {
      // Silently handle One Tap cancellation errors
      // These errors occur when users close the prompt or decline to sign in
      // Common errors: FedCM NetworkError, AbortError, etc.
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      isCheckSign,
      setIsCheckSign,
      isShowSignModal,
      setIsShowSignModal,
      isShowPaymentModal,
      setIsShowPaymentModal,
      configs,
      fetchConfigs,
      fetchUserCredits,
      fetchUserInfo,
      showOneTap,
    }),
    [
      user,
      isCheckSign,
      isShowSignModal,
      isShowPaymentModal,
      configs,
      fetchConfigs,
      fetchUserCredits,
      fetchUserInfo,
      showOneTap,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
