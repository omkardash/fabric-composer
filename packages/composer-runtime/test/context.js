/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const AccessController = require('../lib/accesscontroller');
const AclManager = require('composer-common').AclManager;
const Api = require('../lib/api');
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;
const Context = require('../lib/context');
const DataCollection = require('../lib/datacollection');
const DataService = require('../lib/dataservice');
const Engine = require('../lib/engine');
const Factory = require('composer-common').Factory;
const IdentityManager = require('../lib/identitymanager');
const IdentityService = require('../lib/identityservice');
const Introspector = require('composer-common').Introspector;
const JSTransactionExecutor = require('../lib/jstransactionexecutor');
const ModelManager = require('composer-common').ModelManager;
const QueryExecutor = require('../lib/queryexecutor');
const RegistryManager = require('../lib/registrymanager');
const Resolver = require('../lib/resolver');
const Resource = require('composer-common').Resource;
const ScriptManager = require('composer-common').ScriptManager;
const Serializer = require('composer-common').Serializer;
const TransactionExecutor = require('../lib/transactionexecutor');
const TransactionLogger = require('../lib/transactionlogger');

const chai = require('chai');
const should = chai.should();
chai.use(require('chai-as-promised'));
const sinon = require('sinon');
require('sinon-as-promised');

describe('Context', () => {

    let mockEngine;
    let context;
    let sandbox;

    beforeEach(() => {
        mockEngine = sinon.createStubInstance(Engine);
        context = new Context(mockEngine);
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('#constructor', () => {

        it('should store the engine', () => {
            context.engine.should.equal(mockEngine);
        });

    });

    describe('#initialize', () => {

        it('should load the business network if it is not already in the cache', () => {
            let mockDataService = sinon.createStubInstance(DataService);
            let mockDataCollection = sinon.createStubInstance(DataCollection);
            mockDataService.getCollection.withArgs('$sysdata').resolves(mockDataCollection);
            mockDataCollection.get.withArgs('businessnetwork').resolves({ data: 'aGVsbG8gd29ybGQ=', hash: 'dc9c1c09907c36f5379d615ae61c02b46ba254d92edb77cb63bdcc5247ccd01c' });
            sandbox.stub(context, 'getDataService').returns(mockDataService);
            let mockIdentityService = sinon.createStubInstance(IdentityService);
            mockIdentityService.getCurrentUserID.returns('');
            sandbox.stub(context, 'getIdentityService').returns(mockIdentityService);
            let mockBusinessNetwork = sinon.createStubInstance(BusinessNetworkDefinition);
            sandbox.stub(BusinessNetworkDefinition, 'fromArchive').resolves(mockBusinessNetwork);
            return context.initialize()
                .then(() => {
                    sinon.assert.calledOnce(BusinessNetworkDefinition.fromArchive);
                    sinon.assert.calledWith(BusinessNetworkDefinition.fromArchive, sinon.match((archive) => {
                        return archive.compare(Buffer.from('hello world')) === 0;
                    }));
                });
        });

        it('should not load the business network if it is already in the cache', () => {
            let mockDataService = sinon.createStubInstance(DataService);
            let mockDataCollection = sinon.createStubInstance(DataCollection);
            mockDataService.getCollection.withArgs('$sysdata').resolves(mockDataCollection);
            mockDataCollection.get.withArgs('businessnetwork').resolves({ data: 'aGVsbG8gd29ybGQ=', hash: 'dc9c1c09907c36f5379d615ae61c02b46ba254d92edb77cb63bdcc5247ccd01c' });
            sandbox.stub(context, 'getDataService').returns(mockDataService);
            let mockIdentityService = sinon.createStubInstance(IdentityService);
            sandbox.stub(context, 'getIdentityService').returns(mockIdentityService);
            let mockBusinessNetwork = sinon.createStubInstance(BusinessNetworkDefinition);
            Context.cacheBusinessNetwork('dc9c1c09907c36f5379d615ae61c02b46ba254d92edb77cb63bdcc5247ccd01c', mockBusinessNetwork);
            sandbox.stub(BusinessNetworkDefinition, 'fromArchive').rejects();
            return context.initialize()
                .then(() => {
                    sinon.assert.notCalled(BusinessNetworkDefinition.fromArchive);
                });
        });

        it('should load the current participant if an identity is specified', () => {
            let mockDataService = sinon.createStubInstance(DataService);
            let mockDataCollection = sinon.createStubInstance(DataCollection);
            mockDataService.getCollection.withArgs('$sysdata').resolves(mockDataCollection);
            mockDataCollection.get.withArgs('businessnetwork').resolves({ data: 'aGVsbG8gd29ybGQ=', hash: 'dc9c1c09907c36f5379d615ae61c02b46ba254d92edb77cb63bdcc5247ccd01c' });
            sandbox.stub(context, 'getDataService').returns(mockDataService);
            let mockIdentityService = sinon.createStubInstance(IdentityService);
            sandbox.stub(context, 'getIdentityService').returns(mockIdentityService);
            let mockIdentityManager = sinon.createStubInstance(IdentityManager);
            sandbox.stub(context, 'getIdentityManager').returns(mockIdentityManager);
            let mockBusinessNetwork = sinon.createStubInstance(BusinessNetworkDefinition);
            sandbox.stub(BusinessNetworkDefinition, 'fromArchive').resolves(mockBusinessNetwork);
            mockIdentityService.getCurrentUserID.returns('dogeid1');
            let mockParticipant = sinon.createStubInstance(Resource);
            mockParticipant.getFullyQualifiedIdentifier.returns('org.doge.Doge#DOGE_1');
            mockIdentityManager.getParticipant.withArgs('dogeid1').resolves(mockParticipant);
            return context.initialize()
                .then(() => {
                    context.getParticipant().should.equal(mockParticipant);
                });
        });

        it('should load but not set the current participant if an identity is specified and reinitialize is specified', () => {
            let mockDataService = sinon.createStubInstance(DataService);
            let mockDataCollection = sinon.createStubInstance(DataCollection);
            mockDataService.getCollection.withArgs('$sysdata').resolves(mockDataCollection);
            mockDataCollection.get.withArgs('businessnetwork').resolves({ data: 'aGVsbG8gd29ybGQ=', hash: 'dc9c1c09907c36f5379d615ae61c02b46ba254d92edb77cb63bdcc5247ccd01c' });
            sandbox.stub(context, 'getDataService').returns(mockDataService);
            let mockIdentityService = sinon.createStubInstance(IdentityService);
            sandbox.stub(context, 'getIdentityService').returns(mockIdentityService);
            let mockIdentityManager = sinon.createStubInstance(IdentityManager);
            sandbox.stub(context, 'getIdentityManager').returns(mockIdentityManager);
            let mockBusinessNetwork = sinon.createStubInstance(BusinessNetworkDefinition);
            sandbox.stub(BusinessNetworkDefinition, 'fromArchive').resolves(mockBusinessNetwork);
            mockIdentityService.getCurrentUserID.returns('dogeid1');
            let mockParticipant = sinon.createStubInstance(Resource);
            mockParticipant.getFullyQualifiedIdentifier.returns('org.doge.Doge#DOGE_1');
            mockIdentityManager.getParticipant.withArgs('dogeid1').resolves(mockParticipant);
            return context.initialize(true)
                .then(() => {
                    should.equal(context.getParticipant(), null);
                });
        });

        it('should throw an error if an invalid identity is specified', () => {
            let mockDataService = sinon.createStubInstance(DataService);
            let mockDataCollection = sinon.createStubInstance(DataCollection);
            mockDataService.getCollection.withArgs('$sysdata').resolves(mockDataCollection);
            mockDataCollection.get.withArgs('businessnetwork').resolves({ data: 'aGVsbG8gd29ybGQ=', hash: 'dc9c1c09907c36f5379d615ae61c02b46ba254d92edb77cb63bdcc5247ccd01c' });
            sandbox.stub(context, 'getDataService').returns(mockDataService);
            let mockIdentityService = sinon.createStubInstance(IdentityService);
            sandbox.stub(context, 'getIdentityService').returns(mockIdentityService);
            let mockIdentityManager = sinon.createStubInstance(IdentityManager);
            sandbox.stub(context, 'getIdentityManager').returns(mockIdentityManager);
            let mockBusinessNetwork = sinon.createStubInstance(BusinessNetworkDefinition);
            sandbox.stub(BusinessNetworkDefinition, 'fromArchive').resolves(mockBusinessNetwork);
            mockIdentityService.getCurrentUserID.returns('dogeid1');
            mockIdentityManager.getParticipant.withArgs('dogeid1').rejects(new Error('no such participant'));
            return context.initialize()
                .should.be.rejectedWith(/The identity may be invalid or may have been revoked/);
        });

        it('should add the default JavaScript transaction executor', () => {
            let mockDataService = sinon.createStubInstance(DataService);
            let mockDataCollection = sinon.createStubInstance(DataCollection);
            mockDataService.getCollection.withArgs('$sysdata').resolves(mockDataCollection);
            mockDataCollection.get.withArgs('businessnetwork').resolves({ data: 'aGVsbG8gd29ybGQ=', hash: 'dc9c1c09907c36f5379d615ae61c02b46ba254d92edb77cb63bdcc5247ccd01c' });
            sandbox.stub(context, 'getDataService').returns(mockDataService);
            let mockIdentityService = sinon.createStubInstance(IdentityService);
            mockIdentityService.getCurrentUserID.returns('');
            sandbox.stub(context, 'getIdentityService').returns(mockIdentityService);
            let mockBusinessNetwork = sinon.createStubInstance(BusinessNetworkDefinition);
            sandbox.stub(BusinessNetworkDefinition, 'fromArchive').resolves(mockBusinessNetwork);
            return context.initialize()
                .then(() => {
                    let transactionExecutors = context.getTransactionExecutors();
                    transactionExecutors.should.have.lengthOf(1);
                    transactionExecutors[0].should.be.an.instanceOf(JSTransactionExecutor);
                });
        });

    });

    describe('#getDataService', () => {

        it('should throw as abstract method', () => {
            (() => {
                context.getDataService();
            }).should.throw(/abstract function called/);
        });

    });

    describe('#getIdentityService', () => {

        it('should throw as abstract method', () => {
            (() => {
                context.getIdentityService();
            }).should.throw(/abstract function called/);
        });

    });

    describe('#getModelManager', () => {

        it('should throw if not initialized', () => {
            (() => {
                context.getModelManager();
            }).should.throw(/must call initialize before calling this function/);
        });

        it('should return the business networks model manager', () => {
            let mockModelManager = sinon.createStubInstance(ModelManager);
            context.businessNetworkDefinition = sinon.createStubInstance(BusinessNetworkDefinition);
            context.businessNetworkDefinition.getModelManager.returns(mockModelManager);
            context.getModelManager().should.equal(mockModelManager);
        });

    });

    describe('#getScriptManager', () => {

        it('should throw if not initialized', () => {
            (() => {
                context.getScriptManager();
            }).should.throw(/must call initialize before calling this function/);
        });

        it('should return the business networks script manager', () => {
            let mockScriptManager = sinon.createStubInstance(ScriptManager);
            context.businessNetworkDefinition = sinon.createStubInstance(BusinessNetworkDefinition);
            context.businessNetworkDefinition.getScriptManager.returns(mockScriptManager);
            context.getScriptManager().should.equal(mockScriptManager);
        });

    });

    describe('#getAclManager', () => {

        it('should throw if not initialized', () => {
            (() => {
                context.getAclManager();
            }).should.throw(/must call initialize before calling this function/);
        });

        it('should return the business networks ACL manager', () => {
            let mockAclManager = sinon.createStubInstance(AclManager);
            context.businessNetworkDefinition = sinon.createStubInstance(BusinessNetworkDefinition);
            context.businessNetworkDefinition.getAclManager.returns(mockAclManager);
            context.getAclManager().should.equal(mockAclManager);
        });

    });

    describe('#getFactory', () => {

        it('should throw if not initialized', () => {
            (() => {
                context.getFactory();
            }).should.throw(/must call initialize before calling this function/);
        });

        it('should return the business networks model manager', () => {
            let mockFactory = sinon.createStubInstance(Factory);
            context.businessNetworkDefinition = sinon.createStubInstance(BusinessNetworkDefinition);
            context.businessNetworkDefinition.getFactory.returns(mockFactory);
            context.getFactory().should.equal(mockFactory);
        });

    });

    describe('#getSerializer', () => {

        it('should throw if not initialized', () => {
            (() => {
                context.getSerializer();
            }).should.throw(/must call initialize before calling this function/);
        });

        it('should return the business networks model manager', () => {
            let mockSerializer = sinon.createStubInstance(Serializer);
            context.businessNetworkDefinition = sinon.createStubInstance(BusinessNetworkDefinition);
            context.businessNetworkDefinition.getSerializer.returns(mockSerializer);
            context.getSerializer().should.equal(mockSerializer);
        });

    });

    describe('#getIntrospector', () => {

        it('should throw if not initialized', () => {
            (() => {
                context.getIntrospector();
            }).should.throw(/must call initialize before calling this function/);
        });

        it('should return the business networks model manager', () => {
            let mockIntrospector = sinon.createStubInstance(Introspector);
            context.businessNetworkDefinition = sinon.createStubInstance(BusinessNetworkDefinition);
            context.businessNetworkDefinition.getIntrospector.returns(mockIntrospector);
            context.getIntrospector().should.equal(mockIntrospector);
        });

    });

    describe('#getRegistryManager', () => {

        it('should return a new registry manager', () => {
            let mockDataService = sinon.createStubInstance(DataService);
            sinon.stub(context, 'getDataService').returns(mockDataService);
            let mockIntrospector = sinon.createStubInstance(Introspector);
            sinon.stub(context, 'getIntrospector').returns(mockIntrospector);
            let mockSerializer = sinon.createStubInstance(Serializer);
            sinon.stub(context, 'getSerializer').returns(mockSerializer);
            let mockAccessController = sinon.createStubInstance(AccessController);
            sinon.stub(context, 'getAccessController').returns(mockAccessController);
            context.getRegistryManager().should.be.an.instanceOf(RegistryManager);
        });

        it('should return an existing registry manager', () => {
            let mockRegistryManager = sinon.createStubInstance(RegistryManager);
            context.registryManager = mockRegistryManager;
            context.getRegistryManager().should.equal(mockRegistryManager);
        });

    });

    describe('#getResolver', () => {

        it('should return a new registry manager', () => {
            let mockRegistryManager = sinon.createStubInstance(RegistryManager);
            sinon.stub(context, 'getRegistryManager').returns(mockRegistryManager);
            let mockIntrospector = sinon.createStubInstance(Introspector);
            sinon.stub(context, 'getIntrospector').returns(mockIntrospector);
            context.getResolver().should.be.an.instanceOf(Resolver);
        });

        it('should return an existing registry manager', () => {
            let mockResolver = sinon.createStubInstance(Resolver);
            context.resolver = mockResolver;
            context.getResolver().should.equal(mockResolver);
        });

    });

    describe('#getApi', () => {

        it('should return a new API', () => {
            let mockFactory = sinon.createStubInstance(Factory);
            sinon.stub(context, 'getFactory').returns(mockFactory);
            let mockParticipant = sinon.createStubInstance(Resource);
            sinon.stub(context, 'getParticipant').returns(mockParticipant);
            let mockRegistryManager = sinon.createStubInstance(RegistryManager);
            sinon.stub(context, 'getRegistryManager').returns(mockRegistryManager);
            context.getApi().should.be.an.instanceOf(Api);
        });

        it('should return an existing API', () => {
            let mockApi = sinon.createStubInstance(Api);
            context.api = mockApi;
            context.getApi().should.equal(mockApi);
        });

    });

    describe('#getQueryExecutor', () => {

        it('should return a new query executor', () => {
            let mockResolver = sinon.createStubInstance(Resolver);
            sinon.stub(context, 'getResolver').returns(mockResolver);
            context.getQueryExecutor().should.be.an.instanceOf(QueryExecutor);
        });

        it('should return an existing query executor', () => {
            let mockQueryExecutor = sinon.createStubInstance(QueryExecutor);
            context.queryExecutor = mockQueryExecutor;
            context.getQueryExecutor().should.equal(mockQueryExecutor);
        });

    });

    describe('#getIdentityManager', () => {

        it('should return a new identity manager', () => {
            let mockDataService = sinon.createStubInstance(DataService);
            sinon.stub(context, 'getDataService').returns(mockDataService);
            let mockRegistryManager = sinon.createStubInstance(RegistryManager);
            sinon.stub(context, 'getRegistryManager').returns(mockRegistryManager);
            context.getIdentityManager().should.be.an.instanceOf(IdentityManager);
        });

        it('should return an existing registry manager', () => {
            let mockIdentityManager = sinon.createStubInstance(IdentityManager);
            context.identityManager = mockIdentityManager;
            context.getIdentityManager().should.equal(mockIdentityManager);
        });

    });

    describe('#getParticipant', () => {

        it('should return the current participant', () => {
            let mockParticipant = sinon.createStubInstance(Resource);
            context.participant = mockParticipant;
            context.getParticipant().should.equal(mockParticipant);
        });

    });

    describe('#setParticipant', () => {

        it('should set the current participant and create a participant logger', () => {
            let mockParticipant = sinon.createStubInstance(Resource);
            let mockAccessController = sinon.createStubInstance(AccessController);
            context.accessController = mockAccessController;
            context.setParticipant(mockParticipant);
            context.participant.should.equal(mockParticipant);
            sinon.assert.calledOnce(mockAccessController.setParticipant);
            sinon.assert.calledWith(mockAccessController.setParticipant, mockParticipant);
        });

        it('should throw if a participant has already been set', () => {
            let mockParticipant = sinon.createStubInstance(Resource);
            let mockAccessController = sinon.createStubInstance(AccessController);
            context.accessController = mockAccessController;
            context.setParticipant(mockParticipant);
            (() => {
                context.setParticipant(mockParticipant);
            }).should.throw(/A current participant has already been specified/);
        });

    });

    describe('#getTransaction', () => {

        it('should return the current transaction', () => {
            let mockTransaction = sinon.createStubInstance(Resource);
            context.transaction = mockTransaction;
            context.getTransaction().should.equal(mockTransaction);
        });

    });

    describe('#setTransaction', () => {

        it('should set the current transaction and create a transaction logger', () => {
            let mockTransaction = sinon.createStubInstance(Resource);
            let mockRegistryManager = sinon.createStubInstance(RegistryManager);
            sinon.stub(context, 'getRegistryManager').returns(mockRegistryManager);
            let mockSerializer = sinon.createStubInstance(Serializer);
            sinon.stub(context, 'getSerializer').returns(mockSerializer);
            context.setTransaction(mockTransaction);
            context.transaction.should.equal(mockTransaction);
            context.transactionLogger.should.be.an.instanceOf(TransactionLogger);
        });

        it('should throw if a transaction has already been set', () => {
            let mockTransaction = sinon.createStubInstance(Resource);
            let mockRegistryManager = sinon.createStubInstance(RegistryManager);
            sinon.stub(context, 'getRegistryManager').returns(mockRegistryManager);
            let mockSerializer = sinon.createStubInstance(Serializer);
            sinon.stub(context, 'getSerializer').returns(mockSerializer);
            context.setTransaction(mockTransaction);
            (() => {
                context.setTransaction(mockTransaction);
            }).should.throw(/A current transaction has already been specified/);
        });

    });

    describe('#addTransactionExecutor', () => {

        it('should add a new transaction executor', () => {
            let mockTransactionExecutor = sinon.createStubInstance(TransactionExecutor);
            mockTransactionExecutor.getType.returns('JS');
            context.addTransactionExecutor(mockTransactionExecutor);
            context.transactionExecutors.should.have.lengthOf(1);
            context.transactionExecutors[0].should.equal(mockTransactionExecutor);
        });

        it('should ignore an existing transaction executor of a different type', () => {
            let mockTransactionExecutor1 = sinon.createStubInstance(TransactionExecutor);
            mockTransactionExecutor1.getType.returns('GO');
            context.addTransactionExecutor(mockTransactionExecutor1);
            context.transactionExecutors.should.have.lengthOf(1);
            context.transactionExecutors[0].should.equal(mockTransactionExecutor1);
            let mockTransactionExecutor2 = sinon.createStubInstance(TransactionExecutor);
            mockTransactionExecutor2.getType.returns('JS');
            context.addTransactionExecutor(mockTransactionExecutor2);
            context.transactionExecutors.should.have.lengthOf(2);
            context.transactionExecutors[0].should.equal(mockTransactionExecutor1);
            context.transactionExecutors[1].should.equal(mockTransactionExecutor2);
        });

        it('should replace an existing transaction executor of the same type', () => {
            let mockTransactionExecutor1 = sinon.createStubInstance(TransactionExecutor);
            mockTransactionExecutor1.getType.returns('JS');
            context.addTransactionExecutor(mockTransactionExecutor1);
            context.transactionExecutors.should.have.lengthOf(1);
            context.transactionExecutors[0].should.equal(mockTransactionExecutor1);
            let mockTransactionExecutor2 = sinon.createStubInstance(TransactionExecutor);
            mockTransactionExecutor2.getType.returns('JS');
            context.addTransactionExecutor(mockTransactionExecutor2);
            context.transactionExecutors.should.have.lengthOf(1);
            context.transactionExecutors[0].should.equal(mockTransactionExecutor2);
        });

    });

    describe('#getTransactionExecutors', () => {

        it('should return no transaction executors by default', () => {
            let transactionExecutors = context.getTransactionExecutors();
            transactionExecutors.should.have.lengthOf(0);
        });

        it('should return the transaction executors', () => {
            let mockTransactionExecutor1 = sinon.createStubInstance(TransactionExecutor);
            mockTransactionExecutor1.getType.returns('JS');
            let mockTransactionExecutor2 = sinon.createStubInstance(TransactionExecutor);
            mockTransactionExecutor2.getType.returns('dogelang');
            context.transactionExecutors = [mockTransactionExecutor1, mockTransactionExecutor2];
            context.getTransactionExecutors().should.deep.equal([mockTransactionExecutor1, mockTransactionExecutor2]);
        });

    });

    describe('#getAccessController', () => {

        it('should return a new access controller', () => {
            let mockAclManager = sinon.createStubInstance(AclManager);
            sinon.stub(context, 'getAclManager').returns(mockAclManager);
            context.getAccessController().should.be.an.instanceOf(AccessController);
        });

        it('should return an existing query executor', () => {
            let mockAccessController = sinon.createStubInstance(AccessController);
            context.accessController = mockAccessController;
            context.getAccessController().should.equal(mockAccessController);
        });

    });

    describe('#toJSON', () => {

        it('should return an empty object', () => {
            context.toJSON().should.deep.equal({});
        });

    });

});
