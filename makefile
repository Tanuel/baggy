.PHONY: bootstrap serve test clean aws-mock aws-bucket

export EXPRESS_S3_DC_FILE=examples/express-s3/docker-compose.yml
export MOCK_BUCKET=baggy-registry-mock
bootstrap:
	yarn install

serve:
	yarn serve

test:
	./test.sh

clean:
	rm -rf .local

aws-mock:
	docker-compose -f ${EXPRESS_S3_DC_FILE} up

aws-clean:
	docker-compose -f ${EXPRESS_S3_DC_FILE} down
	docker-compose -f ${EXPRESS_S3_DC_FILE} rm -f -v
	sudo rm -rf .local/localstack

aws-bucket:
	awslocal s3 mb s3://${MOCK_BUCKET}
	awslocal s3api put-bucket-acl --bucket ${MOCK_BUCKET} --acl public-read
	#TODO: use website-configuration and redirect to server when artifact does not exists to trigger proxy
	#awslocal s3api put-bucket-website --bucket ${MOCK_BUCKET} --website-configuration file://examples/express-s3/s3-website-configuration.json
