import React from 'react';
import { Button, ButtonProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';

interface TFButtonProps extends Omit<ButtonProps, 'children'> {
  title: string;
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Custom button component wrapping react-native-paper Button
 */
export const TFButton: React.FC<TFButtonProps> = ({
  title,
  loading = false,
  fullWidth = false,
  mode = 'contained',
  style,
  ...rest
}) => {
  return (
    <Button
      mode={mode}
      loading={loading}
      disabled={loading || rest.disabled}
      style={[
        styles.button,
        fullWidth && styles.fullWidth,
        style,
      ]}
      contentStyle={styles.content}
      {...rest}
    >
      {title}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: 8,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    paddingVertical: 6,
  },
});
