export type User = {
  userId: string;
  username: string;
  isHost: boolean;
  userLocale?: 'en-US' | string | undefined;
};
