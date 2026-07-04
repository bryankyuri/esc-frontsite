import { createContext, useCallback, useEffect, useState } from "react";

type Context = {
  handleLoading: (value: boolean) => void;
  screenWidth: number;
};

export const AppContext = createContext<Context>({
  handleLoading: () => {},
  screenWidth: -1,
});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [, setIsloading] = useState<boolean>(false);
  const [screenWidth, setScreenWidth] = useState<number>(-1);

  const handleLoading = (value: boolean) => {
    setIsloading(value);
  };

  const screenResize = useCallback(() => {
    setScreenWidth(screen.width);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", screenResize);
    return () => {
      window.removeEventListener("resize", screenResize);
    };
  }, [screenResize]);

  useEffect(() => {
    screenResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider
      value={{
        handleLoading,
        screenWidth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
