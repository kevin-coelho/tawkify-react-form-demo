import React from 'react';
import TextField from '@material-ui/core/TextField';
import PropTypes from 'prop-types';

TawkifyInput.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  err: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default function TawkifyInput(props) {
  const {
    label,
    placeholder,
    err,
    value,
    onChange,
    disabled,
    onKeyDown,
  } = props;
  if (err) {
    return (
      <TextField
        InputLabelProps={{
          color: 'primary',
          shrink: true,
        }}
        onKeyDown={onKeyDown}
        disabled={disabled}
        error
        placeholder={disabled ? 'This input is disabled' : placeholder}
        label={label}
        helperText={err}
        value={value}
        onChange={onChange}
      />
    );
  }
  return (
    <TextField
      InputLabelProps={{
        shrink: true,
      }}
      onKeyDown={onKeyDown}
      disabled={disabled}
      placeholder={disabled ? 'This input is disabled' : placeholder}
      label={label}
      value={value}
      onChange={onChange}
    />
  );
}
