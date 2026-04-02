#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class StratumAPITester:
    def __init__(self, base_url="https://c8eeba47-a62a-440e-a5c9-efaa0c8ee9c1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=False):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION FLOW")
        print("="*50)
        
        # Test login with admin credentials
        login_success, login_response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@stratum.io", "password": "StratumAdmin123!"}
        )
        
        if not login_success:
            print("❌ Admin login failed - stopping auth tests")
            return False
            
        # Test get current user
        self.run_test(
            "Get Current User",
            "GET", 
            "auth/me",
            200
        )
        
        # Test user registration
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@test.com"
        self.run_test(
            "User Registration",
            "POST",
            "auth/register", 
            200,
            data={"email": test_email, "password": "TestPass123!", "name": "Test User"}
        )
        
        # Test logout
        self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        
        return True

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD STATS")
        print("="*50)
        
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success and response:
            required_fields = [
                'total_agents', 'active_agents', 'total_runs', 'completed_runs',
                'failed_runs', 'success_rate', 'pending_hitl', 'total_policies',
                'enabled_policies', 'total_tokens', 'total_cost', 'avg_success_rate',
                'recent_runs'
            ]
            
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"❌ Missing fields in dashboard stats: {missing_fields}")
                return False
            else:
                print(f"✅ All required dashboard fields present")
                print(f"   Total Agents: {response.get('total_agents')}")
                print(f"   Total Runs: {response.get('total_runs')}")
                print(f"   Success Rate: {response.get('success_rate')}%")
                return True
        
        return False

    def test_agents_crud(self):
        """Test agents CRUD operations"""
        print("\n" + "="*50)
        print("TESTING AGENTS CRUD")
        print("="*50)
        
        # List agents
        success, agents = self.run_test(
            "List Agents",
            "GET",
            "agents",
            200
        )
        
        if success:
            print(f"✅ Found {len(agents)} agents")
            if len(agents) >= 5:
                print("✅ Demo agents seeded correctly")
            else:
                print(f"❌ Expected 5 demo agents, found {len(agents)}")
        
        # Get specific agent
        if agents and len(agents) > 0:
            agent_id = agents[0].get('agent_id')
            self.run_test(
                f"Get Agent {agent_id}",
                "GET",
                f"agents/{agent_id}",
                200
            )
        
        # Create new agent
        test_agent_id = f"test_agent_{datetime.now().strftime('%H%M%S')}"
        create_success, created_agent = self.run_test(
            "Create Agent",
            "POST",
            "agents",
            200,
            data={
                "agent_id": test_agent_id,
                "name": "Test Agent",
                "role": "tester",
                "description": "Test agent for API testing",
                "permissions": ["call:llm"],
                "limits": {"max_input_tokens": 1000}
            }
        )
        
        if create_success:
            # Update agent
            self.run_test(
                "Update Agent",
                "PUT",
                f"agents/{test_agent_id}",
                200,
                data={"description": "Updated test agent"}
            )
            
            # Delete agent
            self.run_test(
                "Delete Agent",
                "DELETE",
                f"agents/{test_agent_id}",
                200
            )
        
        return success

    def test_workflows(self):
        """Test workflows endpoints"""
        print("\n" + "="*50)
        print("TESTING WORKFLOWS")
        print("="*50)
        
        # List workflows
        success, workflows = self.run_test(
            "List Workflows",
            "GET",
            "workflows",
            200
        )
        
        if success and workflows:
            print(f"✅ Found {len(workflows)} workflows")
            if len(workflows) >= 1:
                workflow_id = workflows[0].get('workflow_id')
                self.run_test(
                    f"Get Workflow {workflow_id}",
                    "GET",
                    f"workflows/{workflow_id}",
                    200
                )
        
        return success

    def test_runs(self):
        """Test runs endpoints"""
        print("\n" + "="*50)
        print("TESTING RUNS")
        print("="*50)
        
        # List runs
        success, response = self.run_test(
            "List Runs",
            "GET",
            "runs",
            200
        )
        
        if success and response:
            runs = response.get('runs', [])
            print(f"✅ Found {len(runs)} runs")
            
            if runs:
                run_id = runs[0].get('run_id')
                self.run_test(
                    f"Get Run Details {run_id}",
                    "GET",
                    f"runs/{run_id}",
                    200
                )
        
        # Test create run (requires workflow)
        workflows_success, workflows = self.run_test(
            "Get Workflows for Run Test",
            "GET",
            "workflows",
            200
        )
        
        if workflows_success and workflows:
            workflow_id = workflows[0].get('workflow_id')
            self.run_test(
                "Create Run",
                "POST",
                "runs",
                200,
                data={
                    "workflow_id": workflow_id,
                    "input_data": {"test": "data"}
                }
            )
        
        return success

    def test_policies(self):
        """Test policies endpoints"""
        print("\n" + "="*50)
        print("TESTING POLICIES")
        print("="*50)
        
        # List policies
        success, policies = self.run_test(
            "List Policies",
            "GET",
            "policies",
            200
        )
        
        if success:
            print(f"✅ Found {len(policies)} policies")
            if len(policies) >= 4:
                print("✅ Demo policies seeded correctly")
            
            if policies:
                policy_id = policies[0].get('policy_id')
                self.run_test(
                    f"Get Policy {policy_id}",
                    "GET",
                    f"policies/{policy_id}",
                    200
                )
        
        return success

    def test_hitl_queue(self):
        """Test HITL queue endpoints"""
        print("\n" + "="*50)
        print("TESTING HITL QUEUE")
        print("="*50)
        
        # List HITL items
        success, hitl_items = self.run_test(
            "List HITL Items",
            "GET",
            "hitl",
            200
        )
        
        if success:
            print(f"✅ Found {len(hitl_items)} HITL items")
            
            # Find pending item for decision test
            pending_items = [item for item in hitl_items if item.get('status') == 'pending']
            if pending_items:
                request_id = pending_items[0].get('request_id')
                self.run_test(
                    "Approve HITL Request",
                    "POST",
                    f"hitl/{request_id}/decide",
                    200,
                    data={"action": "approve", "reason": "Test approval"}
                )
        
        return success

    def test_integrations(self):
        """Test integrations endpoints"""
        print("\n" + "="*50)
        print("TESTING INTEGRATIONS")
        print("="*50)
        
        # List integrations
        success, integrations = self.run_test(
            "List Integrations",
            "GET",
            "integrations",
            200
        )
        
        if success:
            print(f"✅ Found {len(integrations)} integrations")
            if len(integrations) >= 3:
                print("✅ Demo integrations seeded correctly")
            
            if integrations:
                integration_id = integrations[0].get('integration_id')
                self.run_test(
                    "Update Integration",
                    "PUT",
                    f"integrations/{integration_id}",
                    200,
                    data={"status": "connected"}
                )
        
        return success

    def test_api_keys(self):
        """Test API key management endpoints"""
        print("\n" + "="*50)
        print("TESTING API KEY MANAGEMENT")
        print("="*50)
        
        # Re-login for authenticated endpoints
        login_success, _ = self.run_test(
            "Re-login for API Key Tests",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@stratum.io", "password": "StratumAdmin123!"}
        )
        
        if not login_success:
            print("❌ Re-login failed - skipping API key tests")
            return False
        
        # Generate API key
        generate_success, generate_response = self.run_test(
            "Generate API Key",
            "POST",
            "keys/generate",
            200
        )
        
        if generate_success and generate_response:
            api_key = generate_response.get('key')
            if api_key and api_key.startswith('sk_stratum_'):
                print(f"✅ API key generated with correct prefix: {api_key[:20]}...")
            else:
                print(f"❌ API key format incorrect: {api_key}")
        
        # Get current user's API key
        get_success, get_response = self.run_test(
            "Get My API Key",
            "GET",
            "keys/me",
            200
        )
        
        if get_success and get_response:
            key = get_response.get('key')
            if key:
                print(f"✅ Retrieved API key: {key[:20]}...")
            else:
                print("❌ No API key found")
        
        # Test regenerate API key
        regen_success, regen_response = self.run_test(
            "Regenerate API Key",
            "POST",
            "keys/regenerate",
            200
        )
        
        if regen_success and regen_response:
            new_key = regen_response.get('key')
            if new_key and new_key.startswith('sk_stratum_'):
                print(f"✅ New API key generated: {new_key[:20]}...")
                # Verify it's different from the original
                if generate_response and new_key != generate_response.get('key'):
                    print("✅ Regenerated key is different from original")
                else:
                    print("❌ Regenerated key is same as original")
            else:
                print(f"❌ Regenerated key format incorrect: {new_key}")
        
        return generate_success and get_success and regen_success

    def test_onboarding(self):
        """Test onboarding endpoints"""
        print("\n" + "="*50)
        print("TESTING ONBOARDING")
        print("="*50)
        
        # Get onboarding status
        status_success, status_response = self.run_test(
            "Get Onboarding Status",
            "GET",
            "onboarding/status",
            200
        )
        
        if status_success and status_response:
            steps = status_response.get('steps', [])
            if len(steps) == 4:
                print("✅ Onboarding has 4 steps as expected")
                step_ids = [step.get('id') for step in steps]
                expected_ids = ['generate_key', 'install_sdk', 'register_agent', 'first_run']
                if step_ids == expected_ids:
                    print("✅ Onboarding step IDs are correct")
                else:
                    print(f"❌ Step IDs mismatch. Expected: {expected_ids}, Got: {step_ids}")
                
                # Check step completion status
                for step in steps:
                    step_id = step.get('id')
                    completed = step.get('completed', False)
                    print(f"   Step {step_id}: {'✅ Completed' if completed else '⏳ Pending'}")
            else:
                print(f"❌ Expected 4 onboarding steps, got {len(steps)}")
        
        # Test quick agent creation
        test_agent_id = f"onboarding_agent_{datetime.now().strftime('%H%M%S')}"
        create_success, create_response = self.run_test(
            "Create Onboarding Agent",
            "POST",
            "onboarding/create-agent",
            200,
            data={
                "agent_id": test_agent_id,
                "name": "Onboarding Test Agent",
                "role": "processor",
                "description": "Test agent created during onboarding",
                "permissions": ["call:llm"]
            }
        )
        
        if create_success and create_response:
            created_agent_id = create_response.get('agent_id')
            if created_agent_id == test_agent_id:
                print(f"✅ Onboarding agent created successfully: {created_agent_id}")
                
                # Verify agent appears in agents list
                verify_success, agents = self.run_test(
                    "Verify Onboarding Agent in List",
                    "GET",
                    "agents",
                    200
                )
                
                if verify_success:
                    agent_ids = [agent.get('agent_id') for agent in agents]
                    if test_agent_id in agent_ids:
                        print("✅ Onboarding agent appears in agents list")
                    else:
                        print("❌ Onboarding agent not found in agents list")
            else:
                print(f"❌ Agent ID mismatch. Expected: {test_agent_id}, Got: {created_agent_id}")
        
        return status_success and create_success

    def test_llm_integration(self):
        """Test LLM integration endpoints - NEW for Iteration 3"""
        print("\n" + "="*50)
        print("TESTING LLM INTEGRATION (NEW)")
        print("="*50)
        
        # Test LLM connectivity
        llm_success, llm_response = self.run_test(
            "LLM Test Endpoint",
            "GET",
            "llm/test",
            200
        )
        
        if llm_success and llm_response:
            status = llm_response.get('status')
            response_text = llm_response.get('response')
            model = llm_response.get('model')
            tokens = llm_response.get('tokens')
            duration = llm_response.get('duration')
            
            if status == 'ok':
                print(f"✅ LLM connection successful")
                print(f"   Model: {model}")
                print(f"   Response: {response_text[:100]}...")
                print(f"   Tokens: {tokens}")
                print(f"   Duration: {duration}s")
                
                # Verify it's using the correct model
                if model and 'nemotron' in model.lower():
                    print("✅ Using correct Nemotron model")
                else:
                    print(f"❌ Unexpected model: {model}")
                    
                # Verify response contains expected text
                if response_text and 'stratum' in response_text.lower():
                    print("✅ LLM response contains expected content")
                else:
                    print(f"❌ Unexpected LLM response: {response_text}")
            else:
                print(f"❌ LLM test failed with status: {status}")
                if 'error' in llm_response:
                    print(f"   Error: {llm_response['error']}")
        
        return llm_success

    def test_real_run_execution(self):
        """Test real run execution with LLM calls - NEW for Iteration 3"""
        print("\n" + "="*50)
        print("TESTING REAL RUN EXECUTION (NEW)")
        print("="*50)
        
        # Re-login for authenticated endpoints
        login_success, _ = self.run_test(
            "Re-login for Run Execution",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@stratum.io", "password": "StratumAdmin123!"}
        )
        
        if not login_success:
            print("❌ Re-login failed - skipping run execution tests")
            return False
        
        # Test real run execution with demo_pipeline
        print("⏳ Starting real run execution (this will take ~45 seconds)...")
        import time
        start_time = time.time()
        
        run_success, run_response = self.run_test(
            "Create Real Run with demo_pipeline",
            "POST",
            "runs",
            200,
            data={
                "workflow_id": "demo_pipeline",
                "input_data": {"task": "Analyze the current state of AI governance and provide recommendations"}
            }
        )
        
        execution_time = time.time() - start_time
        print(f"⏱️ Execution completed in {execution_time:.1f} seconds")
        
        if run_success and run_response:
            run_id = run_response.get('run_id')
            status = run_response.get('status')
            steps = run_response.get('steps', [])
            total_tokens = run_response.get('total_tokens', 0)
            total_cost = run_response.get('total_cost', 0)
            governance_summary = run_response.get('governance_summary', {})
            
            print(f"✅ Real run created successfully")
            print(f"   Run ID: {run_id}")
            print(f"   Status: {status}")
            print(f"   Steps: {len(steps)}")
            print(f"   Total Tokens: {total_tokens}")
            print(f"   Total Cost: ${total_cost}")
            
            # Verify governance summary
            if governance_summary:
                print("✅ Governance summary present:")
                print(f"   Policies Enforced: {governance_summary.get('policies_enforced')}")
                print(f"   Total Retries: {governance_summary.get('total_retries')}")
                print(f"   Rate Limits Applied: {governance_summary.get('rate_limits_applied')}")
                print(f"   Budget Remaining: {governance_summary.get('budget_remaining')}")
            else:
                print("❌ Governance summary missing")
            
            # Verify steps have real LLM responses and governance checks
            steps_with_llm = 0
            steps_with_governance = 0
            for i, step in enumerate(steps):
                llm_response = step.get('llm_response')
                governance_checks = step.get('governance_checks', [])
                input_tokens = step.get('input_tokens', 0)
                output_tokens = step.get('output_tokens', 0)
                
                if llm_response:
                    steps_with_llm += 1
                    print(f"   Step {i+1}: ✅ Has LLM response ({len(llm_response)} chars)")
                else:
                    print(f"   Step {i+1}: ❌ Missing LLM response")
                
                if governance_checks:
                    steps_with_governance += 1
                    print(f"   Step {i+1}: ✅ Has {len(governance_checks)} governance checks")
                else:
                    print(f"   Step {i+1}: ❌ Missing governance checks")
                
                if input_tokens > 0 or output_tokens > 0:
                    print(f"   Step {i+1}: ✅ Real token counts (in:{input_tokens}, out:{output_tokens})")
                else:
                    print(f"   Step {i+1}: ❌ No token counts")
            
            print(f"📊 Steps with LLM responses: {steps_with_llm}/{len(steps)}")
            print(f"📊 Steps with governance checks: {steps_with_governance}/{len(steps)}")
            
            # Store run_id for frontend testing
            self.latest_run_id = run_id
            
            return True
        else:
            print("❌ Real run execution failed")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Stratum API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        
        # Initialize latest_run_id for frontend testing
        self.latest_run_id = None
        
        # Test authentication first
        auth_success = self.test_auth_flow()
        if not auth_success:
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Test all endpoints
        self.test_dashboard_stats()
        self.test_agents_crud()
        self.test_workflows()
        self.test_runs()
        self.test_policies()
        self.test_hitl_queue()
        self.test_integrations()
        
        # Test existing onboarding features
        self.test_api_keys()
        self.test_onboarding()
        
        # Test NEW LLM integration features (Iteration 3)
        self.test_llm_integration()
        self.test_real_run_execution()
        
        # Print final results
        print("\n" + "="*60)
        print("FINAL TEST RESULTS")
        print("="*60)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests ({len(self.failed_tests)}):")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"   {i}. {test.get('test', 'Unknown')}")
                if 'error' in test:
                    print(f"      Error: {test['error']}")
                else:
                    print(f"      Expected: {test.get('expected')}, Got: {test.get('actual')}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = StratumAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())