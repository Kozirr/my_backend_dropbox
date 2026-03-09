import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./AuthWrapper.css";

interface AuthWrapperProps {
  children: React.ReactNode;
}

function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <Authenticator>
      {children}
    </Authenticator>
  );
}

export default AuthWrapper;
