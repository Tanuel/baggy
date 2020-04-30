.PHONY: bootstrap serve test clean

bootstrap:
	yarn install

serve:
	yarn serve

test:
	./test.sh

clean:
	rm -rf .local
