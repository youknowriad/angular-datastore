angular.module('angular-datastore').provider('AngularDataStore', {

    configModels: [],
    
    socketIOUrl: null,

    addModel: function (configuration) {
        this.configModels.push(configuration);
    },
    
    setSocketIOBaseUrl: function(url) {
        this.socketIOUrl = url;
    },

    $get: ['$rootScope', '$q', 'AngularDataModelFactory', 'AngularDataSerializer', 'AngularDataRestAdapter',
        function ($rootScope, $q, AngularDataModelFactory, AngularDataSerializer, AngularDataRestAdapter) {

            
            /**
             * Array of loaded records by type
             * @type {{}}
             */
            var records = {},
                
            
            socket = this.socketIOUrl ? io.connect(this.socketIOUrl) : null,

            /**
             * Get loaded record by type and primaryKey
             * @param type
             * @param primaryKey
             * @returns {*}
             */
            getRecord = function (type, primaryKey) {
                var found;
                angular.forEach(records[type], function (record) {
                    if (record.getPrimaryKey() === primaryKey) {
                        found = record;
                    }
                });

                return found;
            },

            /**
             * Hydrate the existing record or loads a new one if this does'nt exist
             * @param record
             * @return {*}
             */
            hydrateOrLoad = function (record) {
                var existingRecord = getRecord(record.getType(), record.getPrimaryKey());
                if (angular.isDefined(existingRecord)) {
                    record = existingRecord;
                    AngularDataSerializer.hydrate(existingRecord, AngularDataSerializer.serialize(record, false), this);
                } else {
                    records[record.getType()].push(record);
                }

                return record;
            },
            
            /**
             * Handle Socket IO Events
             */
            handleSocketIO = function (type) {
                var self = this;
                socket.on(type + '.update', function(data) {                    console.log('update', data);
                    $rootScope.$apply(function () {
                        var record = AngularDataSerializer.unserialize(type, data, self);
                        hydrateOrLoad.call(self, record);
                    });
                });
                socket.on(type + '.create', function(data) {
                    $rootScope.$apply(function () {
                        var record = AngularDataSerializer.unserialize(type, data, self);
                        hydrateOrLoad.call(self, record);
                    });
                });
                socket.on(type + '.remove', function(data) {
                    var record = AngularDataSerializer.unserialize(type, data, self);
                    $rootScope.$apply(function () {
                        angular.forEach(records[type], function (value, key) {
                            if (value.getPrimaryKey() === record.getPrimaryKey()) {
                                records[type].splice(key, 1);
                            }
                        });
                    });
                });
            },

            /**
             * Add A new model
             *
             * @param configuration
             */
            addModel = function (configuration) {
                var type  = configuration.name;
                AngularDataSerializer.addModel(type, AngularDataModelFactory.get(configuration));
                records[type]  = [];
                if (socket) {
                    handleSocketIO(type);
                }
            };
            angular.forEach(this.configModels, function (config) {
                addModel(config);
            });

            return {

                /**
                 * Create a new instance of a model with hash content
                 *
                 * @return {}
                 */
                create: function (type, hash) {
                    hash = hash || {};
                    var record = AngularDataSerializer.unserialize(type, hash, this, true);

                    return record;
                },

                /**
                 * Persist the model instance
                 *
                 * @param record
                 */
                save: function (record) {
                    var deferred = $q.defer(),
                        self = this;
                    if (record.isNew) {
                        AngularDataRestAdapter.create(record).then(function (data) {
                            AngularDataSerializer.hydrate(record, data, self);
                            record.isNew = false;
                            hydrateOrLoad.call(self, record);
                            deferred.resolve(record);
                        });
                    } else {
                        AngularDataRestAdapter.update(record).then(function (data) {
                            AngularDataSerializer.hydrate(record, data, self);
                            deferred.resolve(record);
                        });
                    }

                    return deferred.promise;
                },

                /**
                 * Remove a model instance
                 *
                 * @param record
                 */
                remove: function (record) {
                    var deferred = $q.defer(),
                        type = record.getType(),
                        primaryKey = record.getPrimaryKey();
                    AngularDataRestAdapter.remove(record).then(function () {
                        angular.forEach(records[type], function (value, key) {
                            if (value.getPrimaryKey() === primaryKey) {
                                records[type].splice(key, 1);
                            }
                        });

                        deferred.resolve(record);
                    });

                    return deferred.promise;
                },

                /**
                 * Find a model by id
                 *
                 * @param type
                 * @param primaryKey
                 * @returns {boolean}
                 */
                find: function (type, primaryKey) {
                    var deferred = $q.defer(),
                        self = this,
                        found = false;
                    angular.forEach(records[type], function (record) {
                        if (record.getPrimaryKey() === primaryKey) {
                            found = record;
                            deferred.resolve(record);
                        }
                    });

                    if (!found) {
                        AngularDataRestAdapter.find(type, primaryKey).then(function (hash) {
                            var record = AngularDataSerializer.unserialize(type, hash, self);
                            record = hydrateOrLoad.call(self, record);
                            deferred.resolve(record);
                        }, function () {
                            deferred.reject();
                        });
                    }

                    return deferred.promise;
                },

                /**
                 * FindMany by primaryKeys (to be refactored, avoiding rest if all pks already loaded)
                 *
                 * @param type
                 * @param primaryKeys
                 * @returns {*}
                 */
                findMany: function (type, primaryKeys) {
                    var deferred = $q.defer(),
                        self = this;
                    AngularDataRestAdapter.findMany(type, primaryKeys).then(function (hashes) {
                            var results = [];
                            angular.forEach(hashes, function (hash) {
                                var record = AngularDataSerializer.unserialize(type, hash, self);
                                record = hydrateOrLoad.call(self, record);
                                results.push(record);
                            });
                            deferred.resolve(results);
                        }, function () {
                            deferred.reject();
                        });

                    return deferred.promise;
                },

                /**
                 * Find all model instances
                 *
                 * @param type
                 * @returns {*}
                 */
                findAll: function (type) {
                    var deferred = $q.defer(),
                        self = this;
                    AngularDataRestAdapter.findAll(type).then(function (hashes) {
                            angular.forEach(hashes, function (hash) {
                                var record = AngularDataSerializer.unserialize(type, hash, self);
                                hydrateOrLoad.call(self, record);
                            });
                            deferred.resolve(records[type]);
                        }, function () {
                            deferred.reject();
                        });

                    return deferred.promise;
                },

                /**
                 * Find all model instances based on filters
                 *
                 * @param type
                 * @param filters
                 * @returns {Array}
                 */
                findBy : function (type, filters) {
                    var deferred = $q.defer(),
                        self = this;
                    AngularDataRestAdapter.findQuery(type, filters).then(function (hashes) {
                            angular.forEach(hashes, function (hash) {
                                var record = AngularDataSerializer.unserialize(type, hash, self);
                                hydrateOrLoad.call(self, record);
                            });
                            deferred.resolve(records[type]);
                        }, function () {
                            deferred.reject();
                        });

                    return deferred.promise;
                },

                /**
                 * Find the first model instance based on filters
                 *
                 * @param type
                 * @param filters
                 * @returns {*}
                 */
                findOneBy: function (type, filters) {
                    var deferred = $q.defer(),
                        self = this;
                    AngularDataRestAdapter.findQuery(type, filters).then(function (hashes) {
                            if (hashes.length !== 0) {
                                var record = AngularDataSerializer.unserialize(type, hashes[0], self);
                                record = hydrateOrLoad.call(self, record);
                                deferred.resolve(record);
                            } else {
                                deferred.reject();
                            }
                        }, function () {
                            deferred.reject();
                        });

                    return deferred.promise;
                }
            };
        }]
});
