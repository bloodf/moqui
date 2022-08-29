//*
import { ApiClientExtension } from '@vue-storefront/core';
import type { Request, Response } from 'express';
import SetCookieParser from 'set-cookie-parser';

const forwardSetCookies: ApiClientExtension = {
  name: 'forward-set-cookies',
  hooks: (req: Request, res: Response) => {
    return {
      beforeCreate: ({ configuration }) => {
        const sessionCookieName: string = configuration.cookies?.sessionCookieName || 'JSESSIONID';
        const xsrfCookieName: string = configuration.cookies?.xsrfCookieName || 'x-csrf-token';

        return {
          ...configuration,
          state: {
            getSessionId: () => req.cookies[sessionCookieName],
            setSessionId: (sessionId) => {
              if (!sessionId) {
                delete req.cookies[sessionCookieName];
                return;
              }
              res.cookie(sessionCookieName, JSON.stringify(sessionId));
            },
            getCsrfToken: () => req.cookies[xsrfCookieName],
            setCsrfToken: (token) => {
              if (!token) {
                delete req.cookies[xsrfCookieName];
                return;
              }
              res.cookie(xsrfCookieName, JSON.stringify(token));
            }
          }
        };
      },
      afterCreate: ({ configuration }) => configuration,
      beforeCall: ({ /* configuration, callName, */ args }) => args,
      afterCall: ({ /* configuration, callName, */ response }) => {
        // requests here are between the express server and moqui.
        // forward any Set-Cookie headers to final response to client
        const cookies = SetCookieParser.parse(response);
        cookies.forEach((cookie) => {
          const { name, value, ...options } = cookie;
          // @ts-expect-error options.sameSite doesn't map correctly, not an issue though
          res.cookie(name, value, options);
        });
        // forward x-csrf-token header to final response to client
        if (response?.headers?.['x-csrf-token'])
          res.setHeader('x-csrf-token', response?.headers?.['x-csrf-token']);

        return {
          ...(response.data ? response.data : response)
        };

      }
    };
  }
};

export default forwardSetCookies;