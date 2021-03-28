import React from 'react';
import PropTypes from 'prop-types';

import { makeStyles } from '@material-ui/core/styles';

import TawkifyListInput from './TawkifyListInput';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import IconButton from '@material-ui/core/IconButton';
import ClearIcon from '@material-ui/icons/Clear';

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiTextField-root': {
      margin: '10px',
      width: '100%',
    },
    '& .MuiFormLabel-root': {
      color: '#7876A5',
    }
  },
  list: {
    '& .MuiListItemIcon-root': {
      'min-width': '1ch',
      'font-size': '2.5rem',
    },
    '.MuiIconButton-edgeEnd': {
      'font-size': '0.5ch'
    },
    width: '100%',
    //maxWidth: 360,
    backgroundColor: theme.palette.background.paper,
  },
}));

TawkifyFormListInput.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  max: PropTypes.number,
  update: PropTypes.func,
  list: PropTypes.array,
  setList: PropTypes.func,
  name: PropTypes.string,
};

export default function TawkifyFormListInput(props) {
  const classes = useStyles();
  const {
    label,
    placeholder,
    update,
    required,
    disabled,
    list: _list,
    setList: _setList,
    name,
  } = props;
  const [list, setList] = (() => {
    if (_list && _setList) return [_list, _setList];
    else if (_list) return React.useState(_list);
    return React.useState([]);
  })();
  const [input, setInput] = React.useState('');
  const [err, setError] = React.useState(null);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      if (!input.trim() && required) {
        setError('Input cannot be empty');
        return;
      }
      setError(null);
      const newList = list.concat(input);
      setList(newList);
      setInput('');
      if (update) update(newList);
    }
  };

  const handleListRemove = (idx) => {
    if (disabled) {
      setError('Editing this list is disabled');
      return;
    }
    const newList = list.filter((e, i) => i !== idx);
    setList(newList);
    if (update) update(newList);
  };

  return (
    <div className={classes.root}>
      <TawkifyListInput
        onKeyDown={handleKeyDown}
        label={label}
        placeholder={placeholder}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
        }}
        err={err}
        disabled={disabled}
        name={name || null}
      />
      <List className={classes.list}>
        {list.map((value, idx) => {
          return (
            <ListItem key={idx} role={undefined} dense>
              <ListItemIcon>·</ListItemIcon>
              <ListItemText primary={value} />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="remove"
                  onClick={() => handleListRemove(idx)}
                >
                  <ClearIcon style={{ fontSize: '1ch' }} />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
    </div>
  );
}
