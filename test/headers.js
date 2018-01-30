'use strict';

let should = require('should'),
    express = require('express'),
    request = require('supertest'),
    ming = require('../');

describe ('ming headers', () => {

    it('should return the minged headers', done => {
        function inspect (req, res) {
            res.set('x-inspected-by', 'me');
        }
        let server = express()
            .use(ming.headers(inspect))
            .get('/', (req, res) => res.status(200).json({ a: 'a' }).end());
        request(server)
            .get('/')
            .expect(200)
            .expect(res => {
                res.headers.should.have.property('x-inspected-by', 'me');
                res.body.should.eql({a: 'a'});
            })
            .end(done);
    });

    it('should work with promises', done => {
        function inspect (req, res) {
            return Promise.resolve(true)
                .then(() => {
                    res.set('x-inspected-by', 'me');
            });
        }
        let server = express()
            .use(ming.headersAsync(inspect))
            .get('/', (req, res) => res.status(200).json({ a: 'a' }).end());
        request(server)
            .get('/')
            .expect(200)
            .expect(res => {
                res.headers.should.have.property('x-inspected-by', 'me');
                res.body.should.eql({a: 'a'});
            })
            .end(done);
    });

    it('should 500 on a synchronous exception', done => {
        function error (req, res) {
            req.hopefully_fails();
        }
        let server = express()
            .use(ming.headers(error))
            .get('/', (req, res) => res.status(200).json({ a: 'a' }).end());
        request(server)
            .get('/')
            .expect(500)
            .end(done);
    });

    it('should 500 on an asynchronous exception', done => {
        function error (req, res) {
            return Promise.resolve(true)
                .then(() => {
                    req.hopefully_fails();
            });
        }
        let server = express()
            .use(ming.headersAsync(error))
            .get('/', (req, res) => res.status(200).json({ a: 'a' }).end());
        request(server)
            .get('/')
            .expect(500)
            .end(done);
    });

})
