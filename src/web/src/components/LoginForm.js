import React, { useState, useEffect } from 'react'
import { Button, Form, Grid, Header, Icon, Segment, Checkbox, Message } from 'semantic-ui-react'

import Logos from './Shared/Logo';

const initialState = {
  username: '',
  password: '',
  rememberMe: true
}

const LoginForm = ({ onLoginAttempt, loading, error }) => {
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (state.username !== '' && state.password !== '') {
      setReady(true);
    } else {
      setReady(false);
    }
  }, [state])

  const handleChange = (field, value) => {
    setState({
      ...state,
      [field]: value,
    });
  }

  const { username, password, rememberMe } = state;

  return (
    <>
      <Grid textAlign='center' style={{ height: '100vh' }} verticalAlign='middle'>
        <Grid.Column style={{ maxWidth: 372 }}>
          <Header as='h2' textAlign='center' style={{
            whiteSpace: 'pre',
            fontFamily: 'monospace',
            lineHeight: 1.1,
            fontSize: 'inherit',
            letterSpacing: -1
          }}>
          {Logos[Math.floor(Math.random() * Logos.length)]}
          </Header>
          <Form size='large'>
            <Segment loading={loading}>
              <Form.Input 
                fluid icon='user' 
                iconPosition='left' 
                placeholder='Username' 
                onChange={(event) => handleChange('username', event.target.value)}
              />
              <Form.Input
                fluid
                icon='lock'
                iconPosition='left'
                placeholder='Password'
                type='password'
                onChange={(event) => handleChange('password', event.target.value)}
              />
              <Checkbox
                label='Remember Me'
                onChange={() => handleChange('rememberMe', !rememberMe)}
                checked={rememberMe}
              />
            </Segment>
            <Button 
              primary 
              fluid 
              size='large'
              className='login-button'
              loading={loading}
              disabled={!ready || loading}
              onClick={() => onLoginAttempt(username, password, rememberMe)}
            >
              <Icon name='sign in'/>
              Login
            </Button>
            {error && <Message className='login-failure' negative floating>
              <Icon name='x' />
              {error.message}
            </Message>}
          </Form>
        </Grid.Column>
      </Grid>
    </>
  )
}

export default LoginForm