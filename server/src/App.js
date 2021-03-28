import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link as RouterLink,
} from 'react-router-dom';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import Link from '@material-ui/core/Link';
import Container from '@material-ui/core/Container';
import Button from '@material-ui/core/Button';
import axios from 'axios';

import TawkifyFormListInput from './components/TawkifyFormListInput';
import NotFoundPage from './components/NotFoundPage';

const LinkRouter = (props) => <Link {...props} component={RouterLink} />;

export default function App() {
  const [list2, setList2] = React.useState(['Controlled list item 1']);
  const list4InitialValue = ['disabled 1', 'disabled 2', 'disabled 3'];
  const [lists, setLists] = React.useState({
    list4: list4InitialValue,
  });
  const handleSubmit = () => {
    console.log('submitting...', lists);
    return axios
      .post(
        '/form',
        Object.assign(lists, {
          list2: list2,
        }),
      )
      .then((res) =>
        console.log('Form post succeeded', {
          status: res.status,
          msg: res.data.msg,
        }),
      )
      .catch((err) => console.error(err));
  };
  return (
    <Router>
      <div>
        <Breadcrumbs aria-label="breadcrumb">
          <LinkRouter color="inherit" href="/" to="/">
            Tawkify Form
          </LinkRouter>
        </Breadcrumbs>
        <Switch>
          <Route path="/">
            <Container style={{ maxWidth: '800px' }}>
              <form>
                <div>
                  <TawkifyFormListInput
                    label={'Regular list (uncontrolled)'}
                    placeholder={'A placeholder value'}
                    update={(list) => {
                      setLists({ ...lists, list1: list });
                      console.log('list 1 updated', list);
                    }}
                  />
                </div>
                <div>
                  <TawkifyFormListInput
                    label={'Regular list (controlled)'}
                    update={(list) => console.log('list 2 updated', list)}
                    list={list2}
                    setList={setList2}
                  />
                </div>
                <div>
                  <TawkifyFormListInput
                    label={'Regular list (uncontrolled, required)'}
                    required
                    update={(list) => {
                      setLists({ ...lists, list3: list });
                      console.log('list 3 updated', list);
                    }}
                  />
                </div>
                <div>
                  <TawkifyFormListInput
                    label={'Regular list (uncontrolled, disabled)'}
                    disabled
                    placeholder={'A placeholder value'}
                    list={list4InitialValue}
                  />
                </div>
                <Button
                  variant={'outlined'}
                  color={'primary'}
                  onClick={handleSubmit}
                >
                  Submit
                </Button>
              </form>
            </Container>
          </Route>
          <Route component={NotFoundPage} />
        </Switch>
      </div>
    </Router>
  );
}
