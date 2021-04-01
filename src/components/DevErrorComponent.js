import React from 'react';
import PropTypes from 'prop-types';

DevErrorComponent.propTypes = {
  errState: PropTypes.bool.isRequired,
};

export default function DevErrorComponent(props) {
  if (props.errState) throw new Error('I am a development rendering error!');
  return <div></div>;
}
