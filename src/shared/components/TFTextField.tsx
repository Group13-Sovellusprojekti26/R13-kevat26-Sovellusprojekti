import React from 'react';
import { TextInput, TextInputProps, HelperText } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

interface TFTextFieldProps extends Omit<TextInputProps, 'error'> {
  error?: string;
  helperText?: string;
}

/**
 * Custom text field component wrapping react-native-paper TextInput
 */
export const TFTextField: React.FC<TFTextFieldProps> = ({
  error,
  helperText,
  style,
  ...rest
}) => {
  const hasError = !!error;

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        error={hasError}
        style={[styles.input, style]}
        {...rest}
      />
      {(hasError || helperText) && (
        <HelperText type={hasError ? 'error' : 'info'} visible={true}>
          {error || helperText}
        </HelperText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
  },
});
