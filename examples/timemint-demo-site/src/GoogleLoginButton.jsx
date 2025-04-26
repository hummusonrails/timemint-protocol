import { GoogleLogin } from '@react-oauth/google';

export default function GoogleLoginButton({ onSuccess, onError }) {
  return (
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      useOneTap={false}
      width="300"
      text="signin_with"
      shape="pill"
      theme="filled_blue"
      locale="en"
    />
  );
}
